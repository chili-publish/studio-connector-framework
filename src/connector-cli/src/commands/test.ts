import { fail } from "assert";
import { initRuntime, runtimeConfig, evalAsync } from "../qjs/qjs";
import { assertResult } from "../tests/asserts";
import { TestModels } from "../tests/testConfiguration";
import fs from 'fs'

export async function runTests(connectorFile: string, options: any): Promise<void> {

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

        let start = new Date().getTime();

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

                var match = test.asserts.fetch.find((fetchAssert: TestModels.Fetch) => {
                    if (fetchAssert.url === url && fetchAssert.method === options.method) {
                        fetchAssert.count = fetchAssert.count - 1;
                        if (fetchAssert.count < 0) {
                            test.result = { failReason: "Fetch assert (" + fetchAssert.url + ") called more times than expected"};
                        }
                        return true;
                    }
                });

                if (!match) {
                    test.result = {failReason : "Fetch assert (" + url + ") called but not expected"};
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
        try {
            const testResult = await evalAsync(vm, script);
            assertResult(testResult, test, test.method)
        }
        catch (error) {
            test.result = {failReason : JSON.stringify(error)};
        }

        // end tracking time
        let end = new Date().getTime();

        import('chalk').then((chalk) => {
            if (test.result?.failReason) {
                console.log(chalk.default.bgRed.white(`FAIL [${end - start}ms]: ${test.name}::${test.result.failReason}`))
            } else {
                console.log(chalk.default.bgGreen.white(`PASS [${end - start}ms]: ${test.name}`));
            }
        });
    }

    vm.dispose()
    return;
}

