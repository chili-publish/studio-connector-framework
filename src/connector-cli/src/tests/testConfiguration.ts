import { Dictionary, QueryOptions } from "@chili-publish/studio-connectors/dist/Connector.Shared";
import { DownloadIntent, DownloadType } from "@chili-publish/studio-connectors/dist/MediaConnector";

export module TestModels {
  export interface TestConfiguration {
    setup: Setup;
    tests: Test[];
  }
  export interface Setup {
    runtime_options: RuntimeOptions;
  }

  export interface RuntimeOptions extends Record<string, string> {}

  export interface Test {
    result?:
      | {
          failReason?: string;
        }
      | undefined;
    id: string;
    name: string;
    description: string;
    method: string;
    arguments: DownloadArguments | QueryArguments;
    asserts: Asserts;
  }

  export interface DownloadArguments {
    id: string;
    download_type: DownloadType;
    download_intent: DownloadIntent;
    context: Dictionary;
  }

  export interface QueryArguments {
    queryOptions: QueryOptions;
    context: Dictionary;
  }

  export interface Asserts {
    fetch: Fetch[];
  }

  export interface Fetch {
    url: string;
    method: string;
    count: number;
    response: TestResponse;
  }

  export interface TestResponse {
    status: number;
    headers: [string, string][];
    body: string | any;
  }

  class TestBuilder {
    private test: TestModels.Test;

    constructor() {
      this.test = {
        id: '',
        name: '',
        description: '',
        method: '',
        arguments: {
          id: '',
          download_type: 'thumbnail',
          context: {},
        },
        asserts: {
          fetch: [],
        },
      };
    }

    setId(id: string) {
      this.test.id = id;
      return this;
    }

    setName(name: string) {
      this.test.name = name;
      return this;
    }

    setDescr(descr: string) {
      this.test.description = descr;
      return this;
    }

    setMethod(method: string) {
      this.test.method = method;
      return this;
    }

    setArguments(callback: (args: TestModels.DownloadArguments | TestModels.QueryArguments) => void) {
      callback(this.test.arguments);
      return this;
    }

    addAssert(callback: (assert: TestModels.Asserts) => void) {
      callback(this.test.asserts);
      return this;
    }

    build() {
      return this.test;
    }
  }

  class ConfigurationBuilder {
    private configuration: TestModels.TestConfiguration;

    constructor() {
      this.configuration = {
        setup: {
          runtime_options: {},
        },
        tests: [],
      };
    }

    setSetup(callback: (setup: TestModels.Setup) => void) {
      callback(this.configuration.setup);
      return this;
    }

    addTest(callback: (testBuilder: TestBuilder) => void) {
      const testBuilder = new TestBuilder();
      callback(testBuilder);
      this.configuration.tests.push(testBuilder.build());
      return this;
    }

    build() {
      return this.configuration;
    }
  }
}
