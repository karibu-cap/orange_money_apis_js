export enum LogType {
  // error = 'error',
  // info = 'info',
  debug = 'debug',
}

/**
 * The simplified version of transaction status.
 */
export enum Status {
  /**
   * The transaction failed.
   */
  failed = 'failed',

  /**
   * The transaction is pending.
   */
  pending = 'pending',

  /**
   * The transaction succeeded.
   */
  succeeded = 'succeeded',

  /**
   * The status received from the endpoint was not recognized
   */
  unknown = 'unknown',
}

// Todo: verify api status
export enum ApiRawStatus {
  /**
   * Transaction is in progress on Orange system.
   */
  pending = 'PENDING',

  /**
   * The user canceled the payment.
   */
  canceled = 'CANCELLED',

  /**
   * Waiting for user entry.
   */
  initialized = 'INITIATED',

  /**
   * Payment is done for mobile.
   */
  succeeded = 'SUCCESSFULL',

  /**
   * Payment is done for web.
   */
  succeeded2 = 'SUCCESS',

  /**
   * Payment failed.
   */
  failed = 'FAILED',

  /**
   * The token timed out.
   * Note that the minimum token expiration time is 7 min.
   */
  expired = 'EXPIRED',
}

export enum ApiEnvironment {
  dev = 'dev',
  prod = 'prod',
}
