import defaultWorker from "./.open-next/worker.js";

interface CloudflareEnv {
  DATABASE_URL: string;
  [key: string]: string | undefined;
}

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: MinimalExecutionContext) {
    return defaultWorker.fetch(request, env, ctx);
  },
};
