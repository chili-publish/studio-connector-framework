import { initRuntime, evalSync } from "../qjs/qjs";
import fs from 'fs'

export async function runStressTest(connectorFile: string, options: any): Promise<void> {
    if (!connectorFile || fs.existsSync(connectorFile) === false) {
        console.log("connectorFile is required")
        return;
    }
    const vm = await initRuntime(connectorFile, {});

    const iterations: number = options.iterations ? options.iterations : 1000;

    // try 1000 times, monitor memory usage
    for (let i = 0; i < iterations; i++) {
        const capabilities = evalSync(vm, "loadedConnector.getCapabilities()");
        const configurationOptions = evalSync(vm, "loadedConnector.getConfigurationOptions();")

        if (i % (iterations / 10) === 0) {
            console.log("iteration", i);
            console.log(vm.runtime.dumpMemoryUsage());
            console.log("*************")
        }
    }
}