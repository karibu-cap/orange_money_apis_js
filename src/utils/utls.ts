/**
 * Returns the base 64 hash code for the provided data.
 * @param {string} key The login or customer key.
 * @param {string} secret The password or customer secret.
 * @returns
 */
export const hash = (key: string, secret: string): string => {
  const toHash = `${key}:${secret}`;
  const hash: null | ((string: string) => string) = btoa;
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
