import { classValidator as validator } from '../deps/deps';

export enum ApiType {
  // TODO: implement web code validation when possible.
  // Github Issue: https://github.com/softwebos/orange_money_apis/issues/2
  // webCodeValidation = 'web-code-validation',
  ussdPinValidation = 'ussd-pin-validation',
}

export class CashInParameter {
  @validator.IsEnum(ApiType)
  apiType: ApiType;
}

export class CashIn {
  constructor(parameters: CashInParameter) {}
}
