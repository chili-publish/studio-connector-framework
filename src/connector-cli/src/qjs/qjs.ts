import fs from 'fs'
import { QuickJSContext, getQuickJS, QuickJSHandle } from '@tootallnate/quickjs-emscripten'

export let runtimeConfig: RuntimeConfiguration = {
    fetchInterceptor: undefined
}

export function evalSync(vm: QuickJSContext, code: string) {
    var evalResult = vm.evalCode(code);

    const promiseHandle = vm.unwrapResult(evalResult);
    const dump = vm.dump(promiseHandle);
    promiseHandle.dispose();
    return dump;
}

export async function evalAsync(vm: QuickJSContext, code: string) {

    var evalResult = vm.evalCode(code);

    const promiseHandle = vm.unwrapResult(evalResult);
    var scriptResult = vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();

    const endResultPromise = new Promise((resolve) => {
        scriptResult.then((wrappedExecutionResult) => {
            var executionResult = vm.unwrapResult(wrappedExecutionResult);
            var toJsExecutionResult = vm.dump(executionResult);
            executionResult.dispose();
            resolve(toJsExecutionResult);
        });
    });

    await vm.runtime.executePendingJobs(-1);

    return endResultPromise;
}


export type RuntimeConfiguration = {
    fetchInterceptor?: (url: string, options: any) => Promise<Response | undefined>;
};

export async function initRuntime(connectorUri: string, runtimeOptions: any) {
    const QuickJS = await getQuickJS()
    const vm = QuickJS.newContext()

    // add runtime object which has a fetch function to the global object
    var runtime = vm.newObject()

    // add fetchShim
    var fetchShim = vm.newFunction("fetch", (url: QuickJSHandle, r: QuickJSHandle) => {
        let req = vm.dump(r) as RequestInit
        r.dispose()
        const path = vm.getString(url)
        const promise = vm.newPromise()

        var fetcher = runtimeConfig?.fetchInterceptor ? runtimeConfig.fetchInterceptor : fetch;
        fetcher(path, req)
            .then((response) => {
                generateChiliResponseQuickJsObject(response, vm).then((chiliResponse) => {
                    promise.resolve(chiliResponse)
                    chiliResponse.dispose()
                })
            }).catch((error) => {
                const newLocal_1 = vm.newString(error)
                promise.reject(newLocal_1)
                newLocal_1.dispose()
            })

        // IMPORTANT: Once you resolve an async action inside QuickJS,
        // call runtime.executePendingJobs() to run any code that was
        // waiting on the promise or callback.
        promise.settled.then(vm.runtime.executePendingJobs)
        return promise.handle
    })

    // add consoleShim
    var consoleShim = vm.newObject()
    const log = vm.newFunction("log", (...args: any[]) => {
        const nativeArgs = args.map(vm.dump)
        console.log("QuickJS:", ...nativeArgs)
    })
    vm.setProp(consoleShim, "log", log)

    // add optionShim
    var optionShim = vm.newObject()
    vm.setProp(optionShim, "connectorId", vm.newString("acquia"))
    vm.setProp(optionShim, "testing", vm.newNumber(1))

    // copy all runtimeOptions key values to optionShim
    // for (const [key, value] of Object.entries(runtimeOptions)) {
    //     vm.setProp(optionShim, key, vm.newString(value as string))
    // }

    // add logErrorShim
    var logErrorShim = vm.newFunction("logError", (msg: QuickJSHandle) => {
        const nativeMsg = vm.getString(msg)
        console.error("QuickJS:", nativeMsg)
    })

    // add platformShim
    var platformShim = vm.newNumber(1)

    // add sdkVersionShim
    var sdkVersionShim = vm.newString("1.0.0")

    vm.setProp(runtime, "options", optionShim)
    vm.setProp(runtime, "logError", logErrorShim)
    vm.setProp(runtime, "platform", platformShim)
    vm.setProp(runtime, "sdkVersion", sdkVersionShim)
    vm.setProp(runtime, "fetch", fetchShim)

    vm.setProp(vm.global, "console", consoleShim)
    vm.setProp(vm.global, "runtime", runtime)

    runtime.dispose()
    fetchShim.dispose()
    consoleShim.dispose()
    log.dispose()
    optionShim.dispose()
    logErrorShim.dispose()
    platformShim.dispose()
    sdkVersionShim.dispose()

    // load connectors dynamically
    vm.runtime.setModuleLoader((moduleName: string) => {

        if (moduleName === "Connector") {
            return fs.readFileSync(connectorUri, "utf8")
        }

        return ""
    })

    // create global instance of connector 'loadedConnector' in vm
    await evalAsync(vm, `
    var loadedConnector;
(async () => {
    try{
        var mod = await import('./Connector');
        loadedConnector = new mod.default(runtime);
    }catch(error){
        console.log("error", error)
    }
})();    
`);

    return vm
}

async function generateChiliResponseQuickJsObject(response: Response | undefined, vm: QuickJSContext) {

    if (!response) {
        return vm.undefined
    }

    var chiliResponse = vm.newObject();
    vm.setProp(chiliResponse, "ok", vm.newNumber(response.ok ? 1 : 0))
    vm.setProp(chiliResponse, "redirected", vm.newNumber(response.redirected ? 1 : 0))
    vm.setProp(chiliResponse, "status", vm.newNumber(response.status))
    vm.setProp(chiliResponse, "statusText", vm.newString(response.statusText))
    vm.setProp(chiliResponse, "type", vm.newString(response.type))
    vm.setProp(chiliResponse, "url", vm.newString(response.url))

    const contentType = response.headers.get("content-type");
    console.log("contentType", contentType)

    // if data is json, then parse it as text, otherwise return arrayBuffer
    if (contentType?.includes("application/json")) {
        var text = await response.text();
        vm.setProp(chiliResponse, "text", vm.newString(text))
    } else {
        var buffer = await response.arrayBuffer();
        var ArrayBufferPointer = vm.newObject();
        const hashedContent = generateHash(new Int8Array(buffer))

        vm.setProp(ArrayBufferPointer, "id", response.ok ? vm.newString(hashedContent) : vm.newString("-1"))
        vm.setProp(ArrayBufferPointer, "bytes", response.ok ? vm.newNumber(buffer.byteLength) : vm.newNumber(-1))

        vm.setProp(chiliResponse, "arrayBuffer", ArrayBufferPointer)
        ArrayBufferPointer.dispose()
    }


    // add headers
    var vmheader = vm.newObject();

    for (const [key, value] of response.headers.entries()) {
        vm.setProp(vmheader, key, vm.newString(value))
    }

    vm.setProp(chiliResponse, "headers", vmheader)
    vmheader.dispose()

    return chiliResponse
}

function generateHash(buffer: Int8Array): string {
    var hash = 0, i, chr;
    for (i = 0; i < buffer.byteLength; i++) {
        chr = buffer[i];
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}
