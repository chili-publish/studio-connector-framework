import fs from 'fs'
import { program } from 'commander';
import { initRuntime, evalAsync, runtimeConfig } from './qjs';
import { TestModels } from './testConfiguration';
import { assertResult } from './asserts';

async function main() {

    program
        .option('-c, --connectorFile  <connectorFile>')
        .option('-t, --testFile <testFile>');

    program.parse(process.argv);

    const options = program.opts();
    const connectorFile = options.connectorFile;
    const testFile = options.testFile;

    if (!connectorFile || fs.existsSync(connectorFile) === false) {
        console.log("connectorFile is required")
        return;
    }

    if (!testFile || fs.existsSync(testFile) === false) {
        console.log("testFile is required")
        return;
    }

    // parse the test file (its a json)
    const testConfig: TestModels.TestConfiguration = JSON.parse(fs.readFileSync(testFile, "utf8"))
    const vm = await initRuntime(connectorFile, testConfig.setup.runtime_options);

    for (const test of testConfig.tests) {

        // construct a string with all values from test.arguments object to pass to the method
        var argumentsString = " "
        for (const [key, value] of Object.entries(test.arguments)) {
            argumentsString += `${JSON.stringify(value)},`
        }
        argumentsString = argumentsString.slice(0, -1)

        console.log("running test", test.name)

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
                console.log("fetch called", url, options)

                var match = test.asserts.fetch.find((fetchAssert: TestModels.Fetch) => {
                    if (fetchAssert.url === url && fetchAssert.method === options.method) {
                        fetchAssert.count = fetchAssert.count - 1;
                        if (fetchAssert.count === 0) {
                            console.log("fetch assert passed", fetchAssert)
                        } else {
                            console.log("fetch assert failed", fetchAssert)
                        }
                        return true;
                    }
                });

                if (!match) {
                    console.log("fetch assert failed", url, options)
                    return;
                }

                if (match.response) {
                    var response = new Response(JSON.stringify(match.response.body), {
                        status: match.response.status,
                        headers: match.response.headers,
                    });
                    return response;
                }

                return fetch(url, options)
            }
        }

        const testResult = await evalAsync(vm, script);

        assertResult(testResult, test.method)
    }

    vm.dispose()
    return;
}

try {
    main()
} catch (error) {
    console.log(error)
}
