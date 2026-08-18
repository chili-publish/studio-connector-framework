import { SessionStorage } from './storage';

/** Session-backed — survives sidebar remounts and page reload within the tab. */
export const methodParamsStorage = new SessionStorage();

export function methodParamsKey(connectorName: string, methodName: string) {
  return Symbol.for(
    `connector-cli-method-params:${connectorName}:${methodName}`
  );
}
