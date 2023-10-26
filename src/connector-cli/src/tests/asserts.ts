import {Media} from '@chili-publish/studio-connectors';
import {TestModels} from './testConfiguration';

export function assertResult(
  testResult: unknown,
  test: TestModels.Test,
  method: string,
) {
  switch (method) {
    case 'download':
      assertDownloadResult(testResult, test);
      break;
    case 'detail':
      assertDetailResult(testResult, test);
      break;
    case 'query':
      assertQueryResult(testResult, test);
      break;
  }
}

export function assertQueryResult(testResult: unknown, test: TestModels.Test) {
  var r = testResult as Media.MediaPage;

  if (r.data === undefined) {
    test.result = {
      failReason: "query assert failed, 'data' property undefined",
    };
    return;
  }

  if (r.pageSize === undefined) {
    test.result = {
      failReason: "query assert failed, 'pageSize' property undefined",
    };
    return;
  }

  for (const media of r.data) {
    if (media.id === undefined) {
      test.result = {
        failReason: "query assert failed, 'id' property undefined",
      };
      return;
    }

    if (media.name === undefined) {
      test.result = {
        failReason: "query assert failed, 'name' property undefined",
      };
      return;
    }

    if (media.relativePath === undefined) {
      test.result = {
        failReason: "query assert failed, 'relativePath' property undefined",
      };
      return;
    }

    if (media.type === undefined) {
      test.result = {
        failReason: "query assert failed, 'type' property undefined",
      };
      return;
    }
  }
}

export function assertDetailResult(
  testResult: unknown,
  test: TestModels.Test,
) {}

export function assertDownloadResult(
  testResult: unknown,
  test: TestModels.Test,
) {}
