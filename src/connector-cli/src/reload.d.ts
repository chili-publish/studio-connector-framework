// @types/reload package has a bug with integrating of 'ws' module, so copied and updated types here to avoid compilation issue
declare module 'reload' {
  declare function reload(
    app: express.Express,
    opts: OptionsWaitToStartWebSocketServer
  ): Promise<ReloadWithWebSocketServer>;
  declare function reload(
    app: express.Express,
    opts?: Options
  ): Promise<Reload>;

  interface Options {
    port?: number;
    https?: {
      p12?: {
        p12Path: string;
      };
      certAndKey?: {
        key: string;
        cert: string;
      };
      passphrase?: string;
    };
    forceWss?: boolean;
    verbose?: boolean;
    route?: string;
  }

  interface OptionsWaitToStartWebSocketServer extends Options {
    webSocketServerWaitStart: true;
  }

  interface Reload {
    reload(): void;
    wss: ws.Server;
    closeServer(): Promise<Error | undefined>;
  }

  interface ReloadWithWebSocketServer extends Reload {
    startWebSocketServer(): Promise<Reload>;
  }

  export = reload;
}
