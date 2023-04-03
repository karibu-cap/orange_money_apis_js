import { axios, AxiosError, AxiosResponse } from '../../deps/deps';
import { CashInStatus, LogType } from '../../utils/interfaces';
import { encodeDataToXFormUrl, hash, parseAxiosError } from '../../utils/utls';

export class OmUssdApiConfig {
  customerSecret: string;
  customerKey: string;
  xAuthToken: string;
  merchantNumber: string;
  pin: string;
  logger: { debug: (context: string, data?: unknown) => void }; // Allow only debug log for internal api.
}

type Token = {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: string;
};

type CashInInitializationResponse = {
  message: string;
  data: {
    payToken: string;
  };
};

/**
 * e.g of cash in response.
 */
const cashInRespData = {
  message: 'Merchant payment successfully initiated',
  data: {
    id: 51696332,

    createtime: '1672238140',

    subscriberMsisdn: '69xxxxxx',

    amount: 1,

    payToken: 'MP22122828061160596F8A461518',

    txnid: 'MP221228.1536.A13810',

    txnmode: 'order1234',

    inittxnmessage:
      'Paiement e la clientele done.The devrez confirmer le paiement en saisissant son code PIN et vous recevrez alors un SMS. Merci dutiliser des services Orange Money.',

    inittxnstatus: '200',

    confirmtxnstatus: null,

    confirmtxnmessage: null,

    status: 'PENDING',

    notifUrl: 'https://www.y-note.cm/notification',

    description: 'Commande 12345',

    channelUserMsisdn: '69xxxxxx',
  },
};

export class OmCashInWithUssdPinConfirmationApi {
  constructor(private config: OmUssdApiConfig) {
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.constructor', {
      message: 'OmCashInWithUssdPinConfirmationApi config set',
      config,
    });
  }
  private get logger() {
    return this.config.logger;
  }

  private async generateAccessToken(): Promise<{
    data?: Token;
    error?: Record<string, unknown>;
  }> {
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.generateAccessToken:start');
    const hashValue = hash(this.config.customerKey, this.config.customerSecret);
    const header = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${hashValue}`,
    };
    const body = encodeDataToXFormUrl({
      grant_type: 'client_credentials',
    });
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.generateAccessToken', {
      message: 'Generating access token',
      header,
      body,
    });

    try {
      const resp: AxiosResponse<Token> = await axios.post(
        'https://api-s1.orange.cm/token',
        body,
        {
          headers: header,
        }
      );
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.generateAccessToken:end', {
        status: 'success',
      });
      return { data: resp.data };
    } catch (e) {
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.generateAccessToken:end', {
        status: 'failure',
      });
      return { error: parseAxiosError(e) };
    }
  }

  private async cashInInitialization(): Promise<{
    data?: string;
    error?: Record<string, unknown>;
  }> {
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashInInitialization:start');
    const { data, error } = await this.generateAccessToken();
    if (data == null) {
      return { error: { message: 'failed to generate token', raw: error } };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${data.access_token}`,
    };

    try {
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashInInitialization', {
        message: 'Initializing payment(generating pay token)',
        header,
      });

      const resp: AxiosResponse<CashInInitializationResponse, null> =
        await axios.post(
          'https://api-s1.orange.cm/omcoreapis/1.0.2/mp/init',
          null,
          {
            headers: header,
          }
        );
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashInInitialization:end', {
        status: 'success',
      });
      return {
        data: resp.data.data.payToken,
      };
    } catch (error) {
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashInInitialization:end', {
        status: 'failure',
      });
      return {
        error: {
          message: 'Cash in initialization failed',
          error: parseAxiosError(error),
        },
      };
    }
  }

  /**
   * @param param.notifUrl : l’URL de notification sur l’état de la transaction
   * @param param.channelUserMsisdn: le numéro marchand qui sera également fourni lors de la transaction
   * @param param.amount: Le montant de la transaction, les virgules ne sont pas autorisées
   * @param param.subscriberMsisdn: le numéro du payeur, l’indicatif n’est pas autorisé. Exemple de numéro valide: 692954629
   * @param param.pin : le pin (sera également communiqué)
   * @param param.orderId: le numéro de commande associé
   * @param param.description: la description
   * @param param.payToken: Le paytoken récupéré a l’étape 2
   * @returns
   */
  async cashIn(param: {
    notificationUrl: string;
    amount: number;
    referenceId: string;
    comment: string;
    phoneNumber: string;
  }): Promise<{
    raw?: Record<string, unknown>;
    payToken?: string;
    status?: CashInStatus;
    error?: Record<string, unknown>;
  }> {
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashIn:start');
    const { data: tokenData, error: tokenError } =
      await this.generateAccessToken();
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${tokenData.access_token}`,
    };
    const { data: cashInInitializationData, error } =
      await this.cashInInitialization();
    if (cashInInitializationData == null) {
      return { error };
    }
    const body = {
      subscriberMsisdn: param.phoneNumber,
      notifUrl: param.notificationUrl,
      orderId: param.referenceId,
      description: param.comment,
      amount: param.amount,
      channelUserMsisdn: this.config.merchantNumber,
      payToken: cashInInitializationData,
      pin: this.config.pin,
    };
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashIn', {
      message: 'Requesting payment',
      header,
      body,
    });
    try {
      const resp: typeof cashInRespData = await axios.post(
        'https://api-s1.orange.cm/omcoreapis/1.0.2/mp/pay',
        body,
        { headers: header }
      );

      const rawStatus = resp.data.status;
      let status: CashInStatus;
      if (rawStatus == 'PENDING') {
        status = CashInStatus.pending;
      } else if (rawStatus == 'SUCCESSFULL') {
        status = CashInStatus.succeeded;
      } else {
        status = CashInStatus.failed;
      }
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashIn:end', { status: 'success' });
      return {
        raw: resp.data,
        status: status,
        payToken: cashInInitializationData,
      };
    } catch (error) {
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.cashIn:end', { status: 'failure' });
      return {
        error: {
          message: 'Cash in initialization failed',
          error: parseAxiosError(error),
        },
      };
    }
  }

  /**
   *
   * @param payToken The token returned on the initialization.
   */
  async verifyCashIn(payToken: string): Promise<{
    raw?: Record<string, unknown>;
    status?: CashInStatus;
    error?: Record<string, unknown>;
  }> {
    this.logger.debug('OmCashInWithUssdPinConfirmationApi.verifyCashIn:start');
    const { data: tokenData, error: tokenError } =
      await this.generateAccessToken();
    if (tokenData == null) {
      return {
        error: { message: 'failed to generate token', raw: tokenError },
      };
    }
    const header = {
      'X-AUTH-TOKEN': this.config.xAuthToken,
      Authorization: `Bearer ${tokenData.access_token}`,
    };

    try {
      const resp: typeof cashInRespData = await axios.post(
        `https://apis1.orange.cm/omcoreapis/1.0.2/mp/paymentstatus/${payToken}`,
        '',
        {
          headers: header,
        }
      );
      const rawStatus = resp.data.status;
      let status: CashInStatus;
      if (rawStatus == 'PENDING') {
        status = CashInStatus.pending;
      } else if (rawStatus == 'SUCCESSFULL') {
        status = CashInStatus.succeeded;
      } else {
        status = CashInStatus.failed;
      }
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.verifyCashIn:end', { status: 'success' });
      return { raw: resp.data, status: status };
    } catch (e) {
      this.logger.debug('OmCashInWithUssdPinConfirmationApi.verifyCashIn:end', { status: 'failure' });
      return { error: parseAxiosError(e) };
    }
  }
}
