import { verbose } from '../../../core';
import { ExecutionError } from '../../../core/types';

export function validateAllowedDomains(domains: Array<string>) {
  if (domains.length === 0) {
    throw new ExecutionError(
      'You have to specify at least one "allowedDomain"'
    );
  }

  verbose('Validating domains: ' + JSON.stringify(domains));

  const allDomains = domains.filter((d) => d === '*');
  if (allDomains.length > 0) {
    verbose('Incorrect domains: ' + JSON.stringify(allDomains));
    throw new ExecutionError(
      'Some of "allowedDomains" uses "*" as value. This is prohibited. You can specify "*" only as part of host. Execute command with --verbose for more information or use -h for command for details about arguments'
    );
  }
  const useProtocol = domains.filter(
    (d) => d.startsWith('http://') || d.startsWith('https://')
  );
  if (useProtocol.length > 0) {
    verbose('Incorrect domains: ' + JSON.stringify(useProtocol));
    throw new ExecutionError(
      'Some of "allowedDomains" starts from request schema ("http://" or "https://") in their values. You should specify host without it. Execute command with --verbose for more information or use -h for command for details about arguments'
    );
  }
}
