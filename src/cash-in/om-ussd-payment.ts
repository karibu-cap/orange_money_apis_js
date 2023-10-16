import {
  classTransformer,
  classValidator as validator,
  axios,
  AxiosResponse,
} from '../deps/deps';
import { generateAccessToken } from '../utils/acccess_token';
import { ApiEnvironment, ApiRawStatus, Status } from '../utils/interfaces';
import {
  getStatusFromProviderRawStatus,
  omNumber,
  parseAxiosError,
} from '../utils/utils';

export class OmUssdPaymentApiConfig {
  @validator.IsNotEmpty()
  @validator.IsString()
  customerKey: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  customerSecret: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  xAuthToken: string;

  @validator.Matches(omNumber)
  @validator.IsNumberString()
  merchantNumber: string;

  @validator.IsNumberString()
  @validator.IsNotEmpty()
  pin: string;

  /**
   * The environment of the request.
   * This value is ignored when the [personalProviderHost] parameter is set.
   * Since orange money payment api support only production environment, we use
   * a fake mock db on this repository, from [mockapi](https://mockapi.taurs.dev).
   */
  @validator.IsEnum(ApiEnvironment)
  environment: ApiEnvironment;

  /**
   * When configured, this host is used instead of the default official documentation domain.
   * * The environment parameter is ignored when this config is provided.
   * The host can also be a mock server like:
   * - [json placeholder](https://my-json-server.typicode.com)
   * - [mockapi](https://mockapi.taurs.dev)
   * Note: we use mockapi to simulate the dev environment :)
   */
  @validator.IsUrl()
  @validator.IsOptional()
  personalProviderHost?: string;

  @validator.IsObject()
  logger: { debug: (context: string, data: unknown) => void }; // Allow only debug log for internal api.
}

export type VerifyCashInResponse =
  | {
      raw: unknown;
      status: Status;
      rawStatus: ApiRawStatus;
      error?: undefined;
    }
  | {
      raw?: undefined;
      rawStatus?: undefined;
      status?: undefined;
      error: unknown;
    };

class VerifyCashInParam {
  /**
   *  The payToken returned on succeeded cash in initialization.
   */
  @validator.IsNotEmpty()
  @validator.IsString()
  payToken: string;
}

export type InitializeCashInResponse =
  | {
      raw: Record<string, unknown>;
      payToken: string;
      rawStatus: ApiRawStatus;
      status: Status;
      error?: undefined;
    }
  | {
      raw?: undefined;
      status?: undefined;
      rawStatus?: undefined;
      payToken?: undefined;
      error: unknown;
    };

export class InitializeCashInParam {
  /**
   * Your end point that will receive the notification.
   */
  @validator.IsUrl()
  notificationUrl: string;

  /**
   * The amount of the operation, floats are not allowed.
   */
  @validator.Min(1)
  @validator.IsNumber({
    allowInfinity: false,
    allowNaN: false,
    maxDecimalPlaces: 0,
  })
  amount: number;

  @validator.IsNotEmpty()
  @validator.IsString()
  referenceId: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  comment: string;

  /**
   * The phone number of the buyer (your customer).
   */
  @validator.Matches(omNumber)
  @validator.IsNumberString()
  phoneNumber: string;
}

export type CashInInitializationResponse = {
  message: string;
  data: {
    payToken: string;
  };
};

export type ProviderCashInResponse = {
  message: string;
  data: {
    id: number;
    createtime: string;
    subscriberMsisdn: null | string;
    amount: null | string;
    payToken: string;
    txnid: string;
    txnmode: string;
    inittxnmessage: string;
    inittxnstatus: string;
    confirmtxnstatus: string | null;
    confirmtxnmessage: string | null;
    status: ApiRawStatus;
    notifUrl: string;
    description: string;
    channelUserMsisdn: string;
  };
};

export class OmUssdPaymentApi {
  private readonly providerProductionHost = 'https://api-s1.orange.cm';
  /**
   * The fake development environment api.
   * See the configuration file at : /.mockapi.yml
   * For more details go to: https://mockapi.taurs.dev
   */
  private readonly providerDevelopmentHost =
    'https://mockapi.taurs.dev/karibu-cap/orange_money_apis';
  private readonly config: OmUssdPaymentApiConfig;

  /**
   * Constructs a new {OmUssdPaymentApi} and validate the provided configuration.
   * Note: Constructor throw a list of validation error when the provided config is invalid.
   * @constructor
   * @param {OmUssdPaymentApiConfig} config - The Generic configuration set used while sending external request to api provider.
   */
  constructor(config: OmUssdPaymentApiConfig) {
    const parsedConfig = classTransformer.plainToInstance(
      OmUssdPaymentApiConfig,
      config
    );
    const validationResponse = validator.validateSync(parsedConfig);
    if (validationResponse.length > 0) {
      throw { errors: validationResponse };
    }
    parsedConfig.logger.debug('OmUssdPaymentApi.constructor', {
      message: 'OmUssdPaymentApi config set',
      parsedConfig,
    });
    this.config = parsedConfig;
  }

  private get logger() {
    return this.config.logger;
  }

  get providerHost(): string {
    if (this.config.personalProviderHost) {
      return this.config.personalProviderHost;
    }
    if (this.config.environment == ApiEnvironment.dev) {
      return this.providerDevelopmentHost;
    }
    return this.providerProductionHost;
  }

  private async cashInInitialization(): Promise<{
    data?: string;
    error?: Record<string, unknown>;
  }> {
    const loggingID = 'OmUssdPaymentApi.cashInInitialization';

    this.logger.debug(`${loggingID}:start`, '...');
    const { data, error } = await generateAccessToken({
      endPoint: this.providerHost,
      key: this.config.customerKey,
      secret: this.config.customerSecret,
      logger: this.config.logger,
    });
    if (data == null) {
      return { error: { message: 'failed to generate token', raw: error } };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${data.access_token}`,
    };

    try {
      this.logger.debug(`${loggingID}`, {
        message: 'Initializing payment(generating pay token)',
        header,
      });

      const resp: AxiosResponse<CashInInitializationResponse, null> =
        await axios.post(
          `${this.providerHost}/omcoreapis/1.0.2/mp/init`,
          null,
          {
            headers: header,
          }
        );
      this.logger.debug(`${loggingID}:end`, {
        status: 'success',
      });
      return {
        data: resp.data.data.payToken,
      };
    } catch (error) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return {
        error: {
          message: 'Cash in initialization failed',
          raw: parseAxiosError(error),
        },
      };
    }
  }

  /**
   * Initializes cash in.
   * @param {InitializeCashInParam} param - The required initialization parameter.
   * @return {Promise<InitializeCashInResult>}
   */
  async initializeCashIn(
    param: InitializeCashInParam
  ): Promise<InitializeCashInResponse> {
    const loggingID = 'OmUssdPaymentApi.cashIn';
    this.logger.debug(`${loggingID}:start`, { param });
    const parsedParam = classTransformer.plainToInstance(
      InitializeCashInParam,
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
      endPoint: this.providerHost,
      key: this.config.customerKey,
      secret: this.config.customerSecret,
      logger: this.config.logger,
    });
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${tokenData.access_token}`,
    };
    const { data: cashInInitializationData, error } =
      await this.cashInInitialization();
    if (cashInInitializationData == null) {
      return { error };
    }

    // Maybe we should also add validator class on body we send.
    const body = {
      subscriberMsisdn: parsedParam.phoneNumber,
      notifUrl: parsedParam.notificationUrl,
      orderId: parsedParam.referenceId,
      description: parsedParam.comment,
      amount: `${parsedParam.amount}`,
      channelUserMsisdn: this.config.merchantNumber,
      payToken: cashInInitializationData,
      pin: this.config.pin,
    };
    this.logger.debug(`${loggingID}`, {
      message: 'Requesting payment',
      header,
      body,
    });
    try {
      const resp: AxiosResponse<ProviderCashInResponse> = await axios.post(
        `${this.providerHost}/omcoreapis/1.0.2/mp/pay`,
        body,
        { headers: header }
      );

      const rawStatus = resp.data.data.status;
      const status = getStatusFromProviderRawStatus(rawStatus);
      this.logger.debug(`${loggingID}:end`, {
        status: 'success',
      });
      return {
        raw: resp.data,
        status: status,
        rawStatus: rawStatus,
        payToken: cashInInitializationData,
      };
    } catch (error) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return {
        error: {
          message: 'Cash in initialization failed',
          raw: parseAxiosError(error),
        },
      };
    }
  }

  /**
   * Checks status of the cash in.
   * @param {VerifyCashInParam} param - The required verification parameter.
   * @return {Promise<VerifyCashInResponse>}
   */
  async verifyCashIn(param: VerifyCashInParam): Promise<VerifyCashInResponse> {
    const loggingID = 'OmUssdPaymentApi.verifyCashIn';
    this.logger.debug(`${loggingID}:start`, { param });
    const parsedParam = classTransformer.plainToInstance(
      VerifyCashInParam,
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
      endPoint: this.providerHost,
      key: this.config.customerKey,
      secret: this.config.customerSecret,
      logger: this.config.logger,
    });
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${tokenData.access_token}`,
    };

    try {
      const resp: AxiosResponse<ProviderCashInResponse> = await axios.get(
        `${this.providerHost}/omcoreapis/1.0.2/mp/paymentstatus/${parsedParam.payToken}`,
        null,
        {
          headers: header,
        }
      );
      const rawStatus = resp.data.data.status;
      const status = getStatusFromProviderRawStatus(rawStatus);
      this.logger.debug(`${loggingID}:end`, {
        status: 'success',
      });
      return { raw: resp.data, status: status, rawStatus: rawStatus };
    } catch (e) {
      this.logger.debug(`${loggingID}:end`, {
        status: 'failure',
      });
      return { error: parseAxiosError(e) };
    }
  }
}
