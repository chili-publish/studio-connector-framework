import { Authentication } from './authentication';
import { SessionStorage } from './session-storage';

export function createDevelopmentAuthentication() {
  return new Authentication(new SessionStorage('dev_access_token'), {
    baseUrl: 'https://login.chiligrafx-dev.com/oauth',
    clientId: '56ATWoYRxPorgEVrH6vBLaOz64jvZ2yd',
    scope: 'openid profile',
    audience: 'https://chiligrafx.com',
  });
}

export function createProductionAuthentication() {
  return new Authentication(new SessionStorage('prod_access_token'), {
    baseUrl: 'https://login.chiligrafx.com/oauth',
    clientId: '0pwHW0AqORKdZQeX1guq7qzWOQrGOrYi',
    scope: 'openid profile',
    audience: 'https://chiligrafx.com',
  });
}

export function getAuthService(mode: 'dev' | 'prod') {
  return mode === 'prod'
    ? createProductionAuthentication()
    : createDevelopmentAuthentication();
}
