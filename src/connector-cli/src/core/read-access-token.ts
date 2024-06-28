import { getAuthService } from '../authentication';
import { ExecutionError } from './types';

export async function readAccessToken(tenant: 'dev' | 'prod') {
  const authService = getAuthService(tenant);

  if (!(await authService.isAuthenticated())) {
    throw new ExecutionError(
      `Please login first by executing ${
        tenant === 'dev'
          ? '"connector-cli login -t dev"'
          : '"connector-cli login"'
      } command`
    );
  }

  const accessToken = authService.sessionStorage.accessToken;
  return `${accessToken?.token.token_type} ${accessToken?.token.access_token}`;
}
