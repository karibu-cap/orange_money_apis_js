import { AxiosError, AxiosResponse } from 'axios';
import { ApiRawStatus, Status } from './interfaces';
import { getStatusFromProviderRawStatus, hash, parseAxiosError } from './utils';

describe('hash', () => {
  const btoaRef = btoa;
  it('should still Hash if the btao function is not available', () => {
    global.btoa = undefined as unknown as typeof btoaRef;
    const hashResponse = hash('key', 'secret');
    expect(hashResponse).toBe('a2V5OnNlY3JldA==');
    global.btoa = btoaRef;
  });
});

describe('parseAxiosError', () => {
  it('should return initial obj if not instance of axios error', () => {
    const initialObj = { key: 'ERROR_100' };
    const parsedResponse = parseAxiosError(initialObj);
    expect(parsedResponse).toBe(initialObj);
  });

  it('should have the configuration failed message when config failed', () => {
    const message = 'configuration failed';
    const parsedResponse = parseAxiosError(
      new AxiosError(message) as unknown as Record<string, unknown>
    );
    expect(parsedResponse).toEqual({
      configFailed: message,
    });
  });

  it('should return request failed when axios is unable to send the request.', () => {
    const request = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const parsedResponse = parseAxiosError(
      new AxiosError('message', '400', undefined, request) as unknown as Record<
        string,
        unknown
      >
    );
    expect(parsedResponse).toEqual({
      requestFailed: request,
    });
  });

  it('should return response error when the request response fail to be retrieve.', () => {
    const request = {
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    };
    const response = <AxiosResponse>{
      data: '',
      status: 201,
      statusText: 'created',
      headers: {},
      request: request,
    };

    const parsedResponse = parseAxiosError(
      new AxiosError(
        'message',
        '400',
        undefined,
        request,
        response
      ) as unknown as Record<string, unknown>
    );
    expect(parsedResponse).toEqual({
      responseError: {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      requestBody: request.body,
    });
  });
});

describe('getStatusFromProviderRawStatus', () => {
  it('should return the valid status depending of the raw status provided', () => {
    const test = getStatusFromProviderRawStatus;
    const failureTest =
      test(ApiRawStatus.canceled) === test(ApiRawStatus.expired) &&
      test(ApiRawStatus.canceled) === test(ApiRawStatus.failed);
    expect(failureTest).toBe(true);
    const pendingTest =
      test(ApiRawStatus.pending) === test(ApiRawStatus.initialized);
    expect(pendingTest).toBe(true);
    const successTest =
      test(ApiRawStatus.succeeded) === test(ApiRawStatus.succeeded2);
    expect(successTest).toBe(true);
  });

  it('should return the unknown on unsupported raw status provided', () => {
    expect(getStatusFromProviderRawStatus('OTHER_STATUS' as ApiRawStatus)).toBe(
      Status.unknown
    );
  });
});
