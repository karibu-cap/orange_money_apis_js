import { AxiosError } from '../deps/deps';
import { ApiRawStatus, Status } from './interfaces';

/**
 * A merchant number regExp authorized by y-note.
 */
export const yNoteMerchantNumber = /^(237)?(69\d{7}$|65[5-9]\d{6}$)/;

/**
 * An orange money phone number regex. that do not authorize the country prefix.
 */
export const omNumber = /^(69\d{7}$|65[5-9]\d{6}$)/;

/**
 * Returns the base 64 hash code for the provided data.
 * @param {string} key The login or customer key.
 * @param {string} secret The password or customer secret.
 * @returns
 */
export const hash = (key: string, secret: string): string => {
  const toHash = `${key}:${secret}`;
  if (!btoa) {
    return Buffer.from(toHash).toString('base64');
  }
  return btoa(toHash);
};

/**
 * Encode the data to w3 x form encoded url.
 * @param {Record<string, string>} data the data to encode.
 * @return {string} the encoded value.
 */
export function encodeDataToXFormUrl(data: Record<string, string>): string {
  const segments: string[] = [];
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(data[key]);
      segments.push(`${encodedKey}=${encodedValue}`);
    }
  }
  return segments.join('&');
}

/**
 * Parse a given axios error.
 * @param error The error that occurred.
 * @returns The passed error if error instanceof AxiosError.
 */
export function parseAxiosError(
  error: Record<string, unknown>
): Record<string, unknown> {
  let err = error;
  if (error instanceof AxiosError) {
    if (error.response) {
      err = {
        responseError: {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
        },
        requestBody: error.request.body,
      };
    } else if (error.request) {
      err = {
        requestFailed: error.request,
      };
    } else {
      err = {
        configFailed: error.message,
      };
    }
  }
  return err;
}

export function getStatusFromProviderRawStatus(
  rawStatus: ApiRawStatus
): Status {
  switch (rawStatus) {
    case ApiRawStatus.pending:
    case ApiRawStatus.initialized:
      return Status.pending;
    case ApiRawStatus.succeeded:
    case ApiRawStatus.succeeded2:
      return Status.succeeded;
    case ApiRawStatus.canceled:
    case ApiRawStatus.expired:
    case ApiRawStatus.failed:
      return Status.failed;
  }
  return Status.unknown;
}
