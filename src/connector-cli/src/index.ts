import fs from 'fs'
import { program } from 'commander';
import { initRuntime, evalAsync, runtimeConfig, evalSync } from './qjs';
import { TestModels } from './testConfiguration';
import { assertResult } from './asserts';
import { stdout } from 'process';

async function main() {

    program
        .name('connector-cli')
        .version('1.0.0')
        .description('Tool to manage connector test/publish process')

    program
        .command('info')
        .argument('<connector file>', 'Connector file (compiled) to get info about')
        .option('-o, --out <out>', "Output json file")
        .action(runGetInfo);

    program
        .command('test')
        .argument('<connectorFile>', 'Connector file (compiled js) to run test suite for')
        .option('-t, --testFile <testFile>')
        .action(runTests);

    program.parse(process.argv);
}

try {
    main()
} catch (error) {
    console.log(error)
}


async function runGetInfo(connectorFile: string, options: any): Promise<void> {
    if (!connectorFile || fs.existsSync(connectorFile) === false) {
        console.log("connectorFile is required")
        return;
    }
    const vm = await initRuntime(connectorFile, {});

    const capabilities = evalSync(vm, "loadedConnector.getCapabilities()");
    const configurationOptions = evalSync(vm, "loadedConnector.getConfigurationOptions();")

    const properties = JSON.stringify({
        capabilities,
        configurationOptions
    }, null, 2);

    if (options.out) {
        fs.writeFileSync(options.out ? options.out : "./out.json", properties);
    } else {
        process.stdout.write(properties)
    }

}

async function runTests(connectorFile:string, options: any): Promise<void> {
    
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

