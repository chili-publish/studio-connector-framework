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
      'Some "allowedDomains" use "*" as the entire value, which is prohibited. You can only use "*" as part of a host. Execute command with --verbose for more information or use -h for command for details about arguments'
    );
  }
  const useProtocol = domains.filter(
    (d) => d.startsWith('http://') || d.startsWith('https://')
  );
  if (useProtocol.length > 0) {
    verbose('Incorrect domains: ' + JSON.stringify(useProtocol));
    throw new ExecutionError(
      'Some "allowedDomains" start with a request schema ("http://" or "https://"), which is not allowed. You should specify the host without it. Execute the command with --verbose for more information or use -h for command for details about arguments.'
    );
  }
}
