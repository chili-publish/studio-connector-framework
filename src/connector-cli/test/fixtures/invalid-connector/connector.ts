import { Connector, Media } from '@chili-publish/studio-connectors';

export default class InvalidConnector implements Media.MediaConnector {
  // Intentionally broken: missing required methods and invalid type
  query(): number {
    return 'not-a-number' as unknown as number;
  }
}
