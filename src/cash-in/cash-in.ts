import { classValidator as validator } from '../deps/deps';
import { CashInStatus, LogType } from '../utils/interfaces';
import { OmCashInWithUssdPinConfirmationApi } from './api-implementation/ussd-pin-validation';

export enum ApiType {
  // TODO: implement web code validation when possible.
  // Github Issue: https://github.com/softwebos/orange_money_apis/issues/2
  // webCodeValidation = 'web-code-validation',
  ussdPinValidation = 'ussd-pin-validation',
}

export class CashInParameter {
  @validator.IsEnum(ApiType)
  apiType: ApiType;
  customerKey: string;
  pin: string;
  merchantNumber: string;
  xAuthToken: string;
  customerSecret: string;
  logger: Record<LogType, (context: string, data: unknown) => void>;
}

type CashInitParam = {
  notificationUrl: string;
  amount: number;
  referenceId: string;
  comment: string;
  phoneNumber: string;
};

export class CashIn {
  private api: OmCashInWithUssdPinConfirmationApi;
  constructor(private config: CashInParameter) {
    this.api = new OmCashInWithUssdPinConfirmationApi({
      customerKey: this.config.customerKey,
      customerSecret: this.config.customerSecret,
      pin: this.config.pin,
      xAuthToken: this.config.xAuthToken,
      merchantNumber: this.config.merchantNumber,
      logger: config.logger,
    });
  }

  private get logger() {
    return this.config.logger;
  }

  async initializeCashIn(param: CashInitParam): Promise<{
    payToken?: string;
    raw?: Record<string, unknown>;
    error?: Record<string, unknown>;
  }> {
    this.logger.info('CashIn.initializeCashIn:start', param);
    const { payToken, status, raw, error } = await this.api.cashIn(param);
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

  async verifyCashIn({
    payToken,
  }: {
    payToken: string;
  }): Promise<CashInStatus | null> {
    this.logger.info('CashIn.verifyCashIn:start', { payToken });
    const { raw, status, error } = await this.api.verifyCashIn(payToken);
    if (error || !status) {
      this.logger.error('CashIn.verifyCashIn:end', {
        status: 'failure',
        error,
        raw,
        rawStatus: status,
      });
      return null;
    }
    if (status == CashInStatus.succeeded) {
      this.logger.info('CashIn.verifyCashIn:end', {
        status: 'complete',
        raw,
        rawStatus: status,
      });
    }
    return status;
  }
}
