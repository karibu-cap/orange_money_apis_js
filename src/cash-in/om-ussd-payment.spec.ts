import { axios, AxiosError, AxiosResponse } from '../deps/deps';
import { Token } from '../utils/acccess_token';
import { ApiEnvironment, ApiRawStatus, Status } from '../utils/interfaces';
import {
  ProviderCashInResponse,
  OmUssdPaymentApi,
  VerifyCashInResponse,
  InitializeCashInParam,
  InitializeCashInResponse,
  OmUssdPaymentApiConfig,
  CashInInitializationResponse,
} from './om-ussd-payment';

describe('OmUssdPaymentApi:constructor', () => {
  it('should throw on invalid data provided', () => {
    let error;
    try {
      new OmUssdPaymentApi({
        merchantNumber: '',
        customerKey: '',
        customerSecret: '',
        environment: ApiEnvironment.dev,
        pin: '',
        xAuthToken: '',
        logger: { debug() {} },
      });
    } catch (err) {
      error = err;
    }

    expect(error.errors).toHaveLength(5);
  });

  it('should not throw valid data provided', () => {
    let error;
    try {
      new OmUssdPaymentApi({
        merchantNumber: '698092232',
        xAuthToken: 'X_AUTH_TOKEN',
        customerKey: 'CUSTOMER_KEY',
        customerSecret: 'CUSTOMER_SECRET',
        environment: ApiEnvironment.dev,
        pin: '1234',
        logger: { debug() {} },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeUndefined();
  });
});

describe('OmUssdPaymentApi:providerHost', () => {
  it('should return a valid host depending on the provided environment', () => {
    let omUssdPaymentApi = new OmUssdPaymentApi({
      merchantNumber: '698092232',
      xAuthToken: 'X_AUTH_TOKEN',
      customerKey: 'CUSTOMER_KEY',
      customerSecret: 'CUSTOMER_SECRET',
      environment: ApiEnvironment.dev,
      pin: '1234',
      logger: { debug() {} },
    });

    expect(omUssdPaymentApi.providerHost).toBe(
      'https://mockapi.taurs.dev/karibu-cap/orange_money_apis'
    );
    omUssdPaymentApi = new OmUssdPaymentApi({
      merchantNumber: '698092232',
      xAuthToken: 'X_AUTH_TOKEN',
      customerKey: 'CUSTOMER_KEY',
      customerSecret: 'CUSTOMER_SECRET',
      environment: ApiEnvironment.prod,
      pin: '1234',
      logger: { debug() {} },
    });

    expect(omUssdPaymentApi.providerHost).toBe('https://api-s1.orange.cm');
    omUssdPaymentApi = new OmUssdPaymentApi({
      merchantNumber: '698092232',
      xAuthToken: 'X_AUTH_TOKEN',
      customerKey: 'CUSTOMER_KEY',
      customerSecret: 'CUSTOMER_SECRET',
      environment: ApiEnvironment.prod,
      personalProviderHost: 'https://example.com',
      pin: '1234',
      logger: { debug() {} },
    });

    expect(omUssdPaymentApi.providerHost).toBe('https://example.com');
  });
});

describe('OmUssdPaymentApi:initializeCashIn', () => {
  const omUssdPaymentApi = new OmUssdPaymentApi({
    merchantNumber: '698092232',
    xAuthToken: 'X_AUTH_TOKEN',
    customerKey: 'CUSTOMER_KEY',
    customerSecret: 'CUSTOMER_SECRET',
    environment: ApiEnvironment.dev,
    pin: '1234',
    logger: { debug() {} },
  });
  it('should fail on invalid data provided', async () => {
    const { error, payToken, status, raw } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        comment: '',
        notificationUrl: '',
        phoneNumber: '',
        referenceId: '',
      });
    expect(payToken).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toHaveLength(4);
  });

  it('should fail on access token generation failure', async () => {
    const rejectionMessage = 'access denied';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockRejectedValueOnce(new AxiosError(rejectionMessage));

    const { error, payToken, status, raw } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        referenceId: 'REFERENCE_ID',
        phoneNumber: '699947943',
        comment: 'user payment',
        notificationUrl: 'https://example.com',
      });
    expect(payToken).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'failed to generate token',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockRestore();
  });

  it('should fail on cashInInitialization failure:token', async () => {
    const tokenMessage = 'access denied';
    const rejectionMessage = 'initializeCashIn not available';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockRejectedValueOnce(new AxiosError(tokenMessage))
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, payToken, status, raw } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        referenceId: 'REFERENCE_ID',
        phoneNumber: '699947943',
        comment: 'user payment',
        notificationUrl: 'https://example.com',
      });
    expect(payToken).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'failed to generate token',
      raw: { configFailed: tokenMessage },
    });
    expect(mock).toHaveBeenCalledTimes(2);
    mock.mockRestore();
  });
  it('should fail on cashInInitialization failure', async () => {
    const rejectionMessage = 'initializeCashIn not available';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, payToken, status, raw } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        referenceId: 'REFERENCE_ID',
        phoneNumber: '699947943',
        comment: 'user payment',
        notificationUrl: 'https://example.com',
      });
    expect(payToken).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'Cash in initialization failed',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(3);
    mock.mockRestore();
  });
  it('should fail on request failure', async () => {
    const rejectionMessage = 'initializeCashIn not available';
    const returnedPayToken = 'RANDOM_TOKEN';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValueOnce(<AxiosResponse<CashInInitializationResponse>>{
        data: {
          data: {
            payToken: returnedPayToken,
          },
        },
      })
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, payToken, status, raw } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        referenceId: 'REFERENCE_ID',
        phoneNumber: '699947943',
        comment: 'user payment',
        notificationUrl: 'https://example.com',
      });
    expect(payToken).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'Cash in initialization failed',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(4);
    mock.mockRestore();
  });

  it('should succeed', async () => {
    const returnedPayToken = 'RANDOM_TOKEN';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValueOnce(<AxiosResponse<CashInInitializationResponse>>{
        data: {
          data: {
            payToken: returnedPayToken,
          },
        },
      })
      .mockResolvedValue(<AxiosResponse<ProviderCashInResponse>>{
        data: {
          data: {
            payToken: returnedPayToken,
            status: ApiRawStatus.failed,
          },
        },
      });

    const { error, payToken, status, raw, rawStatus } =
      await omUssdPaymentApi.initializeCashIn({
        amount: 5,
        referenceId: 'REFERENCE_ID',
        phoneNumber: '699947943',
        comment: 'user payment',
        notificationUrl: 'https://example.com',
      });
    expect(payToken).toBe(returnedPayToken);
    expect(status).toBe(Status.failed);
    expect(rawStatus).toBe(ApiRawStatus.failed);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(4);
    mock.mockRestore();
  });
});

describe('OmUssdPaymentApi:verifyCashIn', () => {
  const omUssdPaymentApi = new OmUssdPaymentApi({
    merchantNumber: '698092232',
    xAuthToken: 'X_AUTH_TOKEN',
    customerKey: 'CUSTOMER_KEY',
    customerSecret: 'CUSTOMER_SECRET',
    environment: ApiEnvironment.dev,
    pin: '1234',
    logger: { debug() {} },
  });
  it('should fail on invalid data provided', async () => {
    const { error, rawStatus, status, raw } =
      await omUssdPaymentApi.verifyCashIn({
        payToken: '',
      });
    expect(rawStatus).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toHaveLength(1);
  });

  it('should fail on access token generation failure', async () => {
    const rejectionMessage = 'access denied';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockRejectedValueOnce(new AxiosError(rejectionMessage));

    const { error, rawStatus, status, raw } =
      await omUssdPaymentApi.verifyCashIn({
        payToken: 'RETURNED_PAY_TOKEN',
      });
    expect(rawStatus).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'failed to generate token',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockRestore();
  });

  it('should fail on request failure', async () => {
    const rejectionMessage = 'verifyCashIn not available';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, rawStatus, status, raw } =
      await omUssdPaymentApi.verifyCashIn({
        payToken: 'RETURNED_PAY_TOKEN',
      });
    expect(rawStatus).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      configFailed: rejectionMessage,
    });
    expect(mock).toHaveBeenCalledTimes(2);
    mock.mockRestore();
  });

  it('should complete with succeeded transaction', async () => {
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValue(<AxiosResponse<ProviderCashInResponse>>{
        data: {
          data: {
              status: ApiRawStatus.succeeded2,
          },
        },
      });

    const { error, rawStatus, status, raw } =
      await omUssdPaymentApi.verifyCashIn({
        payToken: 'RETURNED_PAY_TOKEN',
      });
    expect(status).toBe(Status.succeeded);
    expect(rawStatus).toBe(ApiRawStatus.succeeded2);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(2);
    mock.mockRestore();
  });

});
