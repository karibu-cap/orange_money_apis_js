import {
  axios,
  AxiosResponse,
  classTransformer,
  classValidator as validator,
} from '../deps/deps';
import { encodeDataToXFormUrl, hash, parseAxiosError } from './utils';

export class GenerateAccessTokenParam {
  @validator.IsNotEmpty()
  @validator.IsString()
  key: string;

  @validator.IsNotEmpty()
  @validator.IsString()
  secret: string;

  @validator.IsUrl()
  endPoint: string;

  @validator.IsObject()
  logger: { debug: (context: string, data?: unknown) => void }; // Allow only debug log for internal api.
}

export type GenerateAccessTokenResponse =
  | {
      data: Token;
      error?: undefined;
    }
  | {
      data?: undefined;
      error: unknown;
    };

export type Token = {
  /**
   * The requested token.
   */
  access_token: string;

  scope?: string;

  /**
   * The type of the requested token.
   */
  token_type: string;

  /** The time to live in seconds. */
  expires_in: string;
};

/**
 * Generate the access token.
 * @returns
 */
export async function generateAccessToken(
  param: GenerateAccessTokenParam
): Promise<GenerateAccessTokenResponse> {
  const loggingID = 'generateAccessToken';
  param.logger.debug(`${loggingID}:start`, `started`);

  const parsedParam = classTransformer.plainToInstance(GenerateAccessTokenParam, param)
  const validationResponse = await validator.validate(parsedParam);
  if (validationResponse.length > 0) {
    parsedParam.logger.debug(`${loggingID}:end`, {
      status: 'failure',
    });
    return { error: validationResponse };
  }
  const hashValue = hash(parsedParam.key, parsedParam.secret);
  const header = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${hashValue}`,
  };
  const body = encodeDataToXFormUrl({
    grant_type: 'client_credentials',
  });
  parsedParam.logger.debug(loggingID, {
    message: 'Generating access token',
    header,
    body,
  });

  try {
    const resp: AxiosResponse<Token> = await axios.post(
      `${parsedParam.endPoint}/token`,
      body,
      {
        headers: header,
      }
    );
    parsedParam.logger.debug(`${loggingID}:end`, {
      status: 'success',
    });
    return { data: resp.data };
  } catch (e) {
    parsedParam.logger.debug(`${loggingID}:end`, {
      status: 'failure',
    });
    return { error: parseAxiosError(e) };
  }
}
