import { axios, AxiosError, AxiosResponse } from '../deps/deps';
import { generateAccessToken, Token } from './acccess_token';

describe('access_token:generateAccessToken', () => {
  it('should fail on invalid parameter', async () => {
    const result = await generateAccessToken({
      endPoint: '',
      key: '',
      secret: '',
      logger: { debug() {}},
    });
    expect(result.data).toBeUndefined();
    expect(result.error).toHaveLength(3);
  });

  it('should fail on request rejection', async () => {
    const errorMessage = 'mock reject the request';
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockRejectedValue(new AxiosError(errorMessage));

    const result = await generateAccessToken({
      endPoint: 'https://route.com/link',
      key: 'anyKey',
      secret: 'unknown',
      logger: { debug() {} },
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({
      configFailed: errorMessage,
    });

    postSpy.mockRestore();
  });

  it('should successfully retrieve token', async () => {
    const accessToken = 'THEaCCESStOKEN';
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockImplementation() // Required to disable call of the original method. see: https://jestjs.io/docs/jest-object#jestspyonobject-methodname
      .mockResolvedValue(<AxiosResponse<Token>>{
        data: {
          access_token: accessToken,
        },
      });

    const result = await generateAccessToken({
      endPoint: 'https://route.com/link',
      key: 'anyKey',
      secret: 'unknown',
      logger: { debug() {} },
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      access_token: accessToken,
    });
    postSpy.mockRestore();
  });
});
