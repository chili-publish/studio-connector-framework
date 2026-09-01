import { resetExecutionContext } from '@cli/core/execution-context';

jest.mock('open');
jest.mock('@inquirer/prompts');

afterEach(() => {
  resetExecutionContext();
});
