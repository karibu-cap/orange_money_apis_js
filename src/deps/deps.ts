import * as https from 'https';
import * as Axios from 'axios';
export * as classValidator from 'class-validator';
export * as classTransformer from 'class-transformer';
export { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
export const axios = Axios.default.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // bypass issue: https://github.com/softwebos/orange_money_apis/issues/4
  }),
});
