declare module '@codegenie/serverless-express' {
  type ServerlessHandler = (
    event: unknown,
    context: unknown,
    callback?: unknown,
  ) => Promise<unknown>;

  export default function serverlessExpress(options: {
    app: unknown;
  }): ServerlessHandler;
}
