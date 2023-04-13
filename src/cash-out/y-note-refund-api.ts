import {
  axios,
  AxiosResponse,
  classTransformer,
  classValidator as validator,
} from '../deps/deps';
import { generateAccessToken } from '../utils/acccess_token';
import {
  ApiEnvironment,
  Status,
  LogType,
  ApiRawStatus,
} from '../utils/interfaces';
import { getStatusFromProviderRawStatus, omNumber, parseAxiosError, yNoteMerchantNumber } from '../utils/utils';

export class YNoteRefundApiConfig {
  /**
   * The user login
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  clientId: string;

  /**
   * The user password
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  clientSecret: string;

  /**
   * The user login
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  customerKey: string;

  /**
   * The user password
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  customerSecret: string;

  /**
   * The merchant number.
   * e.g: 699947943 or 237699947943
   */
  @validator.Matches(yNoteMerchantNumber)
  @validator.IsNumberString()
  channelUserMsisdn: string;

  /**
   * The given pin.
   */
  @validator.IsNumberString()
  @validator.IsNotEmpty()
  pin: string;

  /**
   * The environment of the request.
   */
  @validator.IsEnum(ApiEnvironment)
  environment: ApiEnvironment;

  logger: Record<LogType, (context: string, data: unknown) => void>;
}

export enum YNoteRefundMethod {
  OrangeMoney = 'OrangeMoney',
}

export enum YNoteRefundStep {
  TransferSent = '2',
  InitializingTransfer = '1',
}

export type YNoteRefundApi_RefundResponse =
  | {
      raw: Record<string, unknown>;
      messageId: string;
      error?: undefined;
    }
  | {
      raw?: undefined;
      messageId?: undefined;
      error: unknown;
    };

export type YNoteRefundApi_VerifyRefundResponse =
  | {
      raw: Record<string, unknown>;
      refundStep: YNoteRefundStep;
      status: Status;
      rawStatus: ApiRawStatus;
      error?: undefined;
    }
  | {
      raw?: undefined;
      refundStep?: undefined;
      status?: undefined;
      rawStatus?: undefined;
      error: unknown;
    };

export class YNoteRefundApi_VerifyRefundParam {
  @validator.IsNotEmpty()
  @validator.IsString()
  messageId: string;
}

export class YNoteRefundApi_RefundParam {
  /**
   * The notification url.
   */
  @validator.IsUrl()
  webhook: string;

  /**
   * The amount of the operation, floats are not allowed.
   * Note: the contractual commission will be subtracted from the amount you wish to reimburse.
   * e.g: For a reimbursement of 1000 XAF for example, the customer will receive 985 XAF
   */
  @validator.Min(1)
  @validator.IsNumber({
    allowInfinity: false,
    allowNaN: false,
    maxDecimalPlaces: 0,
  })
  amount: number;

  /**
   * The phone number of the receiver.
   */
  @validator.Matches(omNumber)
  @validator.IsNumberString()
  customerPhone: string;

  /**
   * The name of the customer.
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  customerName: string;

  /**
   * The refund method.
   */
  @validator.IsEnum(YNoteRefundMethod)
  @validator.IsOptional()
  refundMethod?: YNoteRefundMethod;
}

export type YNoteRefundRowResponse = {
  MD5OfMessageBody: string;
  MD5OfMessageAttributes: string;
  MessageId: string;
  ResponseMetadata: {
    RequestId: string;
    HTTPStatusCode: number;
    HTTPHeaders: {
      'x-amzn-requestid': string;
      'x-amzn-trace-id': string;
      date: string;
      'content-type': string;
      'content-length': string;
    };
    RetryAttempts: number;
  };
};

export type YNoteRefundVerificationRowResponse = {
  result: {
    message: string;
    data: {
      createtime: string;
      subscriberMsisdn: string;
      amount: number;
      payToken: string;
      txnid: string;
      txnmode: string;
      txnstatus: string;
      orderId: string;
      status: ApiRawStatus; // Todo: verify status.
      channelUserMsisdn: string;
      description: string;
    };
  };
  parameters: {
    amount: string;
    xauth: string;
    channel_user_msisdn: string;
    customer_key: string;
    customer_secret: string;
    final_customer_name: string;
    final_customer_phone: string;
  };
  CreateAt: string;
  MessageId: string;
  RefundStep: YNoteRefundStep;
};

/**
 * The nodejs implementation of the api provided by y-note.
 */
export class YNoteRefundApi {
  private readonly yNoteApiHost = 'https://omapi.ynote.africa';
  private readonly yNoteApiTokenHost =
    'https://omapi-token.ynote.africa/oauth2';
  private readonly config: YNoteRefundApiConfig;

  /**
   * Constructs a new {YNoteRefundApi} and validate the provided configuration.
   * Note: Constructor throw a list of validation error when the provided config is invalid.
   * @constructor
   * @param {YNoteRefundApiConfig} config - The Generic configurations set required while sending external request to api provider.
   */
  constructor(config: YNoteRefundApiConfig) {
    const parsedConfig = classTransformer.plainToInstance(
      YNoteRefundApiConfig,
      config
    );
    const validationResponse = validator.validateSync(parsedConfig);
    if (validationResponse.length > 0) {
      throw { errors: validationResponse };
    }
    parsedConfig.logger.debug('YNoteRefundApi.constructor', {
      message: 'YNoteRefundApi config set',
      parsedConfig,
    });
    this.config = parsedConfig;
  }
  private get logger(): typeof this.config.logger {
    return this.config.logger;
  }

  /**
   * @param {YNoteRefundApi_RefundParam} param - The refund parameter.
   * @returns
   */
  async refund(
    param: YNoteRefundApi_RefundParam
  ): Promise<YNoteRefundApi_RefundResponse> {
    const loggingID = 'YNoteRefundApi.refund';
    this.logger.debug(`${loggingID}:start`, '...');
    const parsedParam = classTransformer.plainToInstance(
      YNoteRefundApi_RefundParam,
      param
    );
    const validationResponse = await validator.validate(parsedParam);
    if (validationResponse.length > 0) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return { error: validationResponse };
    }
    const { data: tokenData, error: tokenError } = await generateAccessToken({
      endPoint: this.yNoteApiTokenHost,
      key: this.config.clientId,
      secret: this.config.clientSecret,
      logger: this.config.logger,
    });
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      Authorization: `Bearer ${tokenData.access_token}`,
    };
    const body = {
      customerkey: this.config.customerKey,
      customersecret: this.config.customerSecret,
      channelUserMsisdn: this.config.channelUserMsisdn,
      pin: this.config.pin,
      webhook: parsedParam.webhook,
      amount: `${parsedParam.amount}`,
      final_customer_phone: parsedParam.customerPhone,
      final_customer_name: parsedParam.customerName,
      refund_method: parsedParam.refundMethod ?? YNoteRefundMethod.OrangeMoney,
    };
    const endPoint = `${this.yNoteApiHost}/${this.config.environment}/refund`;
    this.logger.debug(`${loggingID}`, {
      message: 'Requesting refund...',
      header,
      body,
      endPoint,
      method: 'post'
    });
    try {
      const resp: AxiosResponse<YNoteRefundRowResponse> = await axios.post(
        endPoint,
        body,
        { headers: header }
      );

      this.logger.debug(`${loggingID}:end`, {
        status: 'success',
      });
      return {
        raw: resp.data,
        messageId: resp.data.MessageId,
      };
    } catch (error) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return {
        error: {
          message: 'Refund initialization failed',
          raw: parseAxiosError(error),
        },
      };
    }
  }

  /**
   * Verify the refund.
   * @param {string} messageId The message id returned by refund.
   */
  async verifyRefund(
    param: YNoteRefundApi_VerifyRefundParam
  ): Promise<YNoteRefundApi_VerifyRefundResponse> {
    const loggingID = 'YNoteRefundApi.verifyRefund';
    this.logger.debug(`${loggingID}:start`, '...');
    const parsedParam = classTransformer.plainToInstance(
      YNoteRefundApi_VerifyRefundParam,
      param
    );
    const validationResponse = await validator.validate(parsedParam);
    if (validationResponse.length > 0) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return { error: validationResponse };
    }

    const { data: tokenData, error: tokenError } = await generateAccessToken({
      endPoint: this.yNoteApiTokenHost,
      key: this.config.clientId,
      secret: this.config.clientSecret,
      logger: this.config.logger,
    });
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      Authorization: `Bearer ${tokenData.access_token}`,
    };
    const endPoint = `${this.yNoteApiHost}/${this.config.environment}/refund/status/${parsedParam.messageId}`;
    this.logger.debug(`${loggingID}`, {
      message: 'Getting refund status...',
      header,
      endPoint,
      method: 'get'
    });
    try {
      const resp: AxiosResponse<YNoteRefundVerificationRowResponse> =
        await axios.get(endPoint, {
          headers: header,
        });
      const rawStatus = resp.data.result.data.status;
      const status = getStatusFromProviderRawStatus(rawStatus);
      

      this.logger.debug(`${loggingID}:end`, {
        status: 'success',
      });
      return {
        raw: resp.data,
        status: status,
        refundStep: resp.data.RefundStep,
        rawStatus: rawStatus,
      };
    } catch (e) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return { error: parseAxiosError(e) };
    }
  }
}
