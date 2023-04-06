import { AxiosRequestConfig, classValidator as validator } from '../deps/deps';
import { CashInStatus, LogType } from '../utils/interfaces';
import { OmCashInWithUssdPinConfirmationApi } from './api-implementation/ussd-pin-validation';

export enum ApiType {
  // TODO: implement web code validation when possible.
  // Github Issue: https://github.com/softwebos/orange_money_apis/issues/2
  // webCodeValidation = 'web-code-validation',
  ussdPinValidation = 'ussd-pin-validation',
}



export enum FakeResponseType {
  /// The
  succeeded,
  failed,
} 


/**
 * The cash in parameter configuration.
 * 
 * Note: request can be made to custom server
 */
export class CashInParameter {
  @validator.IsEnum(ApiType)
  apiType: ApiType;

  @validator.IsNotEmpty()
  @validator.IsString()
  customerKey: string;

  @validator.IsNumber()
  pin: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  merchantNumber: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  xAuthToken: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  customerSecret: string;

  @validator.IsObject()
  logger: Record<LogType, (context: string, data: unknown) => void>;

  /**
   * When configured, this host is used instead of the default official documentation domain.
   * The host can also be a mock server like json placeholder. e.g: https://my-json-server.typicode.com/softwebos/orange_money_apis
   * Note: we really encourage you to use this method for testing purpose instead of mocking every thing in your implementation.
   */
  @validator.IsUrl()
  @validator.IsOptional()
  personalProviderHost?: string


}

class InitializeCashInParam {
  @validator.IsNotEmpty()
  @validator.IsString()
  notificationUrl: string;

  @validator.IsNumber()
  amount: number;

  @validator.IsNotEmpty()
  @validator.IsString()
  referenceId: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  comment: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  phoneNumber: string;
}

type InitializeCashInResult = {
  payToken?: string;
  raw?: Record<string, unknown>;
  error?: Record<string, unknown>;
};

type VerifyCashInResult = {
  raw?: unknown;
  status?: CashInStatus;
  error?: unknown;
};

class VerifyCashInParam {
  // The returned payToken after success of cash in initialization.
  @validator.IsNotEmpty()
  @validator.IsString()
  payToken: string;
}

export class CashIn {
  private api: OmCashInWithUssdPinConfirmationApi;

  /**
   * Constructs a new CashIn and validate the provided configuration before initializing
   * the available api.
   * Note: Constructor throw a list of validation error when the provided config is invalid.
   * @constructor
   * @param {CashInParameter} config - The Generic configuration set used while sending external request to api provider.
   */
  constructor(private config: CashInParameter) {
    const result = validator.validateSync(
      Object.assign(new CashInParameter(), config)
    );
    if (result.length > 0) {
      throw result;
    }
    this.api = new OmCashInWithUssdPinConfirmationApi({
      customerKey: this.config.customerKey,
      customerSecret: this.config.customerSecret,
      pin: this.config.pin,
      xAuthToken: this.config.xAuthToken,
      merchantNumber: this.config.merchantNumber,
      logger: config.logger,
      personalProviderHost: config.personalProviderHost,
    });
  }

  private get logger() {
    return this.config.logger;
  }

  /**
   * Initializes cash in parameter.
   * @param {CashInParameter} param - The required initialization parameter.
   * @return {Promise<InitializeCashInResult>}
   */
  async initializeCashIn(
    param: InitializeCashInParam
  ): Promise<InitializeCashInResult> {
    this.logger.info('CashIn.initializeCashIn:start', param);
    const { payToken, status, raw, error } = await this.api.initializeCashIn(param);
    if (!payToken || status === CashInStatus.failed) {
      this.logger.error('CashIn.initializeCashIn:end', {
        status: 'failure',
        raw,
        error,
      });
      return { error, raw };
    }

    this.logger.info('CashIn.initializeCashIn:end', { status: 'success', raw });
    return { payToken, raw };
  }

  /**
   * Checks status of the cash in.
   * @param {VerifyCashInParam} param - The required verification parameter.
   * @return {Promise<VerifyCashInResult>}
   */
  async verifyCashIn(param: VerifyCashInParam): Promise<VerifyCashInResult> {
    const { payToken } = param;
    this.logger.info('CashIn.verifyCashIn:start', { payToken });
    const { raw, status, error } = await this.api.verifyCashIn(payToken);
    if (error || !status) {
      this.logger.error('CashIn.verifyCashIn:end', {
        status: 'failure',
        error,
        raw,
        rawStatus: status,
      });
      return { error };
    }
    if (status == CashInStatus.succeeded) {
      this.logger.info('CashIn.verifyCashIn:end', {
        status: 'complete',
        raw,
        rawStatus: status,
      });
    }
    return { status, raw };
  }
}
