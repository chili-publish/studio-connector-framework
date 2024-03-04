import { LocalStorage } from '../localstorage';
import { AccessToken } from './authentication';

export type RegisteredAccessToken = {
  token: AccessToken;
  createdAt: Date;
};

export class SessionStorage {
  private storage: LocalStorage = new LocalStorage();

  constructor(private sessionKey: string) {}

  get accessToken(): RegisteredAccessToken | null {
    return JSON.parse(this.storage.getItem(this.sessionKey));
  }
  set accessToken(value: RegisteredAccessToken) {
    this.storage.setItem(this.sessionKey, JSON.stringify(value));
  }
}
