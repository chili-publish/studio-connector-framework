import { errorNoColor, info, verbose, warn } from '../core';
import { SessionStorage } from './session-storage';

type AuthConfig = {
  baseUrl: string;
  clientId: string;
  scope: string;
  audience: string;
};

export type Seconds = number;

export type AccessToken = {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: Seconds;
  token_type: 'Bearer';
};

export class Authentication {
  constructor(
    public sessionStorage: SessionStorage,
    private config: AuthConfig
  ) {}

  async isAuthenticated() {
    const accessToken = this.sessionStorage.accessToken;
    // if no access token, return false
    if (!accessToken) {
      warn('No access token found.');
      return false;
    }

    const expiryDate = addSecondsToDate(
      accessToken.createdAt,
      accessToken.token.expires_in
    );
    // if access token is expired, return false
    if (!expiryDate || expiryDate < new Date()) {
      warn('Access token expired.');
      return false;
    }

    // try to get the user info
    var userInfo = await fetch(this.config.baseUrl + '/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken.token.access_token}`,
      },
    });

    // if user info fails, return false
    if (userInfo.status !== 200) {
      warn('Failed to get user info.');
      return false;
    }

    info('User is authenticated => ' + (await userInfo.json()).name);

    return true;
  }

  async getDeviceCode() {
    const url = `${this.config.baseUrl}/device/code`;
    const body = `client_id=${this.config.clientId}&scope=${this.config.scope}&audience=${this.config.audience}`;
    verbose('Request device code by url ' + url);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to get device code: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  async getAccessToken(deviceCode: any): Promise<AccessToken> {
    const url = `${this.config.baseUrl}/token`;
    verbose('Request token by url ' + url);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode.device_code,
        client_id: this.config.clientId,
      }),
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to get access token: ${response.status} ${response.statusText}`
      );
    }
    const at = await response.json();
    return at;
  }
}

function addSecondsToDate(date: Date, seconds: Seconds): Date | undefined {
  try {
    // ensure we have a date
    date = new Date(date);
    const result = new Date(date.setSeconds(date.getSeconds() + seconds));
    return result;
  } catch (error) {
    errorNoColor('Failed to add seconds to date: ' + error);
    return undefined;
  }
}
