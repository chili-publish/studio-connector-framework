import { outputDirectory } from '../../../utils/connector-project';

export const getGitIgnoreFile = () => `node_modules
${outputDirectory}`;
