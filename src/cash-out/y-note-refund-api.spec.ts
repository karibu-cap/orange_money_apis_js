import { axios, AxiosError, AxiosResponse } from '../deps/deps';
import { Token } from '../utils/acccess_token';
import { ApiEnvironment, ApiRawStatus, Status } from '../utils/interfaces';
import {
  YNoteRefundApi,
  YNoteRefundRowResponse,
  YNoteRefundStep,
  YNoteRefundVerificationRowResponse,
} from './y-note-refund-api';

describe('YNoteRefundApi:constructor', () => {
  it('should throw on invalid data provided', () => {
    let error;
    try {
      const yNoteRefundApi = new YNoteRefundApi({
        channelUserMsisdn: '',
        clientId: '',
        clientSecret: '',
        customerKey: '',
        customerSecret: '',
        environment: ApiEnvironment.dev,
        pin: '',
        logger: { debug() {} },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors).toHaveLength(6);
  });

  it('should not throw valid data provided', () => {
    let error;
    try {
      const yNoteRefundApi = new YNoteRefundApi({
        channelUserMsisdn: '698092232',
        clientId: 'clientID',
        clientSecret: 'CLIENT_SECRET',
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

describe('YNoteRefundApi:refund', () => {
  const yNoteRefundApi = new YNoteRefundApi({
    channelUserMsisdn: '698092232',
    clientId: 'clientID',
    clientSecret: 'CLIENT_SECRET',
    customerKey: 'CUSTOMER_KEY',
    customerSecret: 'CUSTOMER_SECRET',
    environment: ApiEnvironment.dev,
    pin: '1234',
    logger: { debug() {} },
  });
  it('should fail on invalid data provided', async () => {
    const { error, messageId, raw } = await yNoteRefundApi.refund({
      amount: 5,
      customerName: '',
      customerPhone: '',
      webhook: '',
    });
    expect(messageId).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toHaveLength(3);
  });

  it('should fail on access token generation failure', async () => {
    const rejectionMessage = 'access denied';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockRejectedValueOnce(new AxiosError(rejectionMessage));

    const { error, messageId, raw } = await yNoteRefundApi.refund({
      amount: 5,
      customerName: 'Kamado Tanjiro',
      customerPhone: '699947943',
      webhook: 'https://example.com',
    });
    expect(messageId).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'failed to generate token',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockRestore();
  });

  it('should fail on request failure', async () => {
    const rejectionMessage = 'refund not available';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, messageId, raw } = await yNoteRefundApi.refund({
      amount: 5,
      customerName: 'Kamado Tanjiro',
      customerPhone: '699947943',
      webhook: 'https://example.com',
    });
    expect(messageId).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      message: 'Cash in initialization failed',
      raw: { configFailed: rejectionMessage },
    });
    expect(mock).toHaveBeenCalledTimes(2);
    mock.mockRestore();
  });

  it('should success', async () => {
    const returnedMessageId = 'MESSAGE_ID_';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      })
      .mockResolvedValue(<AxiosResponse<YNoteRefundRowResponse>>{
        data: {
          ResponseMetadata: {},
          MessageId: returnedMessageId,
        },
      });

    const { error, messageId, raw } = await yNoteRefundApi.refund({
      amount: 5,
      customerName: 'Kamado Tanjiro',
      customerPhone: '699947943',
      webhook: 'https://example.com',
    });
    expect(messageId).toBe(returnedMessageId);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(2);
    mock.mockRestore();
  });
});

describe('YNoteRefundApi:verifyRefund', () => {
  const yNoteRefundApi = new YNoteRefundApi({
    channelUserMsisdn: '698092232',
    clientId: 'clientID',
    clientSecret: 'CLIENT_SECRET',
    customerKey: 'CUSTOMER_KEY',
    customerSecret: 'CUSTOMER_SECRET',
    environment: ApiEnvironment.dev,
    pin: '1234',
    logger: { debug() {} },
  });

  it('should fail on invalid data provided', async () => {
    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: '',
      });
    expect(refundStep).toBeUndefined();
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

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBeUndefined();
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
    const rejectionMessage = 'refund not available';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      });
    const mock2 = jest
      .spyOn(axios, 'get')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockRejectedValue(new AxiosError(rejectionMessage));

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBeUndefined();
    expect(status).toBeUndefined();
    expect(raw).toBeUndefined();
    expect(error).toEqual({
      configFailed: rejectionMessage,
    });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
    mock.mockRestore();
    mock2.mockRestore();
  });

  it('should complete with pending transaction', async () => {
    const returnedMessageId = 'MESSAGE_ID_';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      });
    const mock2 = jest
      .spyOn(axios, 'get')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValue(<AxiosResponse<YNoteRefundVerificationRowResponse>>{
        data: {
          MessageId: returnedMessageId,
          RefundStep: YNoteRefundStep.InitializingTransfer,
          result: {
            data: {
              status: ApiRawStatus.pending,
            },
          },
        },
      });

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBe(YNoteRefundStep.InitializingTransfer);
    expect(status).toBe(Status.pending);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
    mock.mockRestore();
    mock2.mockRestore();
  });

  it('should complete with succeeded transaction', async () => {
    const returnedMessageId = 'MESSAGE_ID_';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      });
    const mock2 = jest
      .spyOn(axios, 'get')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname

      .mockResolvedValue(<AxiosResponse<YNoteRefundVerificationRowResponse>>{
        data: {
          MessageId: returnedMessageId,
          RefundStep: YNoteRefundStep.TransferSent,
          result: {
            data: {
              status: ApiRawStatus.succeeded,
            },
          },
        },
      });

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBe(YNoteRefundStep.TransferSent);
    expect(status).toBe(Status.succeeded);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
    mock.mockRestore();
    mock2.mockRestore();
  });

  it('should complete with transaction failed', async () => {
    const returnedMessageId = 'MESSAGE_ID_';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      });
    const mock2 = jest
      .spyOn(axios, 'get')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValue(<AxiosResponse<YNoteRefundVerificationRowResponse>>{
        data: {
          MessageId: returnedMessageId,
          RefundStep: YNoteRefundStep.InitializingTransfer,
          result: {
            data: {
              status: ApiRawStatus.failed,
            },
          },
        },
      });

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBe(YNoteRefundStep.InitializingTransfer);
    expect(status).toBe(Status.failed);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
    mock.mockRestore();
    mock2.mockRestore();
  });

  it('should complete with unknown transaction status when unsupported status was received from endpoint.', async () => {
    const returnedMessageId = 'MESSAGE_ID_';
    const mock = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValueOnce(<AxiosResponse<Token>>{
        data: {
          access_token: 'accessToken',
        },
      });
    const mock2 = jest
      .spyOn(axios, 'get')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValue(<AxiosResponse<YNoteRefundVerificationRowResponse>>{
        data: {
          MessageId: returnedMessageId,
          RefundStep: YNoteRefundStep.InitializingTransfer,
          result: {
            data: {},
          },
        },
      });

    const { error, refundStep, status, raw } =
      await yNoteRefundApi.verifyRefund({
        messageId: 'UNIQUE_MESSAGE_ID',
      });
    expect(refundStep).toBe(YNoteRefundStep.InitializingTransfer);
    expect(status).toBe(Status.unknown);
    expect(raw).toBeDefined();
    expect(error).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
    mock.mockRestore();
    mock2.mockRestore();
  });
});
