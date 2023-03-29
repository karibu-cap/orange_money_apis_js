import { classValidator as validator } from '../deps/deps';
import { CashInStatus, DebugType } from '../utils/interfaces';
import { UssdPinValidation } from './api-implementation/ussd-pin-validation';

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
  debug: (type: DebugType, data: unknown) => void;
}

type CashInitParam = {
  notificationUrl: string;
  amount: number;
  referenceId: string;
  comment: string;
  phoneNumber: string;
};

export class CashIn {
  private api: UssdPinValidation;
  constructor(private config: CashInParameter) {
    this.api = new UssdPinValidation({
      customerKey: this.config.customerKey,
      customerSecret: this.config.customerSecret,
      pin: this.config.pin,
      xAuthToken: this.config.xAuthToken,
      merchantNumber: this.config.merchantNumber,
    });
  }

  async initializeCashIn(
    param: CashInitParam
  ): Promise<{ payToken?: string, raw?: Record<string, unknown>; error?: Record<string, unknown> }> {
    const { payToken, status, raw, error } = await this.api.cashIn(param);
    if (!payToken || status === CashInStatus.failed) {
      this.config.debug(DebugType.error, {
        message: 'cashIn init failed: payToken not found',
        error,
      });
      return {error, raw};
    }

    this.config.debug(DebugType.info, {
      message: 'cashIn init succeeded',
      raw,
    });
    return { payToken, raw };
  }

  async verifyCashIn(payToken: string): Promise<CashInStatus | null> {
    const { raw, status, error } = await this.api.verifyCashIn(payToken);
    if (error || !status) {
      this.config.debug(DebugType.error, {
        message: 'cashIn failed',
        error,
      });
      return null;
    }
    if (status == CashInStatus.succeeded) {
      this.config.debug(DebugType.info, {
        message: 'cashIn succeeded',
        raw,
      });
    }
    return status;
  }
}
