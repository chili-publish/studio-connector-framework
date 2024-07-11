import { default as Chalk, default as chalk } from 'chalk';
import fs from 'fs';
import path from 'path';
import {
  compileToTempFile,
  introspectTsFile,
} from '../compiler/connectorCompiler';
import { errorNoColor, info, startCommand, success } from '../core';
import { ExecutionError } from '../core/types';
import { evalAsync, initRuntime, runtimeConfig } from '../qjs/qjs';
import { assertResult } from '../tests/asserts';
import { TestModels } from '../tests/testConfiguration';
import { getConnectorProjectFileInfo } from '../utils/connector-project';

type DemoCommandOptions = unknown;

export async function runDemo(
  projectPath: string,
  options: DemoCommandOptions
): Promise<void> {
  startCommand('demo', { projectPath, options });

  const { connectorFile } = getConnectorProjectFileInfo(projectPath);

  introspectTsFile(connectorFile);

  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  success('Build succeeded -> ' + compilation.tempFile);

  const vm = await initRuntime(compilation.tempFile, {});

  let urlsUsed: string[] = [];

  runtimeConfig.fetchInterceptor = async (url: string, options: any) => {
    urlsUsed.push(url);
    var response = new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
    return response;
  };

  const script = `
      (async () => {
          try{
              return await loadedConnector.query({
                collection: null,
                filter: null,
                pageSize: 1,
                pageToken: null,
                sortBy: null,
                sortOrder: null
              }, {})
          }catch(error){
              console.log("error", error)
          }
      })()`;

  try {
    const testResult = await evalAsync(vm, script);
  } catch (error) {
    console.log(error);
  }

  vm.dispose();

  let dummyTestConfiguration: TestModels.TestConfiguration = {
    setup: {
      runtime_options: {},
    },
    tests: [
      {
        id: 'default_query',
        description: 'default_query',
        name: 'default_query',
        method: 'query',
        arguments: {
          queryOptions: {
            collection: null,
            filter: null,
            pageSize: 1,
            pageToken: null,
            sortBy: null,
            sortOrder: null,
          },
          context: {},
        },
        asserts: {
          fetch: urlsUsed.map<TestModels.Fetch>((url) => {
            return {
              url: url,
              method: 'GET',
              count: 1,
              response: {
                status: 200,
                headers: [['content-type', 'application/json']],
                body: {},
              },
            };
          }),
        },
      },
    ],
  };

  // write dummyTestConfiguration to ./tests.generated.json formatted json
  fs.writeFileSync(
    './tests.generated.json',
    JSON.stringify(dummyTestConfiguration, null, 2)
  );
  return;
}

interface TestsCommandOptions {
  testFile: string;
}

export async function runTests(
  projectPath: string,
  options: TestsCommandOptions
): Promise<void> {
  startCommand('test', { projectPath, options });

  const { connectorFile } = getConnectorProjectFileInfo(projectPath);

  const { testFile } = options;

  if (fs.existsSync(path.resolve(testFile)) === false) {
    throw new ExecutionError('Test file is required');
  }

  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  success('Build succeeded -> ' + compilation.tempFile);

  // parse the test file (its a json)
  const testConfig: TestModels.TestConfiguration = JSON.parse(
    fs.readFileSync(path.resolve(testFile), 'utf8')
  );
  const vm = await initRuntime(
    compilation.tempFile,
    testConfig.setup.runtime_options
  );

  for (const test of testConfig.tests) {
    let start = new Date().getTime();

    // construct a string with all values from test.arguments object to pass to the method
    var argumentsString = ' ';
    for (const [key, value] of Object.entries(test.arguments)) {
      argumentsString += `${JSON.stringify(value)},`;
    }
    argumentsString = argumentsString.slice(0, -1);

    info(`running test ${chalk.bold(test.name)}`);

    const script = `
        (async () => {
            try{
                return await loadedConnector.${test.method}(${argumentsString})
            }catch(error){
                console.log("error", error)
            }
        })()`;

    if (test.asserts.fetch) {
      runtimeConfig.fetchInterceptor = async (url: string, options: any) => {
        var match = test.asserts.fetch.find((fetchAssert: TestModels.Fetch) => {
          if (
            fetchAssert.url === url &&
            fetchAssert.method === options.method
          ) {
            fetchAssert.count = fetchAssert.count - 1;
            if (fetchAssert.count < 0) {
              test.result = {
                failReason:
                  'Fetch assert (' +
                  fetchAssert.url +
                  ') called more times than expected',
              };
            }
            return true;
          }
        });

        if (!match) {
          test.result = {
            failReason: 'Fetch assert (' + url + ') called but not expected',
          };
          return;
        }

        if (match.response) {
          var response = new Response(JSON.stringify(match.response.body), {
            status: match.response.status,
            headers: match.response.headers,
          });
          return response;
        }

        return fetch(url, options);
      };
    }
    try {
      const testResult = await evalAsync(vm, script);
      assertResult(testResult, test, test.method);
    } catch (error) {
      test.result = { failReason: JSON.stringify(error) };
    }

    // end tracking time
    let end = new Date().getTime();

    if (test.result?.failReason) {
      errorNoColor(
        Chalk.bgRed.white(
          `FAIL [${end - start}ms]: ${test.name}::${test.result.failReason}`
        )
      );
    } else {
      success(`PASS [${end - start}ms]: ${test.name}`);
    }
  }

  vm.dispose();
  return;
}
