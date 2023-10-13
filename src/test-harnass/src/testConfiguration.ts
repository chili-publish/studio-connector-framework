
export module TestModels {

    export interface TestConfiguration {
        setup: Setup
        tests: Test[]
    }
    export interface Setup {
        runtime_options: RuntimeOptions
    }

    export interface RuntimeOptions {
        ENV_API_URL: string
    }

    export interface Test {
        id: string
        name: string
        descr: string
        method: string
        arguments: Arguments
        asserts: Asserts
    }

    export interface Arguments {
        id: string
        download_type: string
        context: Context
    }

    export interface Context {
        category: string
    }

    export interface Asserts {
        fetch: Fetch[]
    }

    export interface Fetch {
        url: string
        method: string
        count: number
        response: TestResponse
    }

    export interface TestResponse {
        status: number
        headers: [string, string][]
        body: string | any
    }
}