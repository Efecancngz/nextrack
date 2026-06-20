import defaultWorker from "./.open-next/worker.js";

interface CloudflareEnv {
  DATABASE_URL: string;
  [key: string]: string | undefined;
}

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface MinimalScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: MinimalExecutionContext) {
    return defaultWorker.fetch(request, env, ctx);
  },

  async scheduled(_event: MinimalScheduledEvent, env: CloudflareEnv, ctx: MinimalExecutionContext) {
    if (!env.DATABASE_URL) {
      console.error("[cron] DATABASE_URL is not set — skipping language availability check");
      return;
    }
    // Must happen before the dynamic import below — process.env is otherwise
    // never populated outside the generated fetch handler's request path,
    // and prisma.ts reads process.env.DATABASE_URL at module top-level.
    process.env.DATABASE_URL = env.DATABASE_URL;
    const { checkLanguageAvailability } = await import("./src/lib/language-tracking");
    ctx.waitUntil(checkLanguageAvailability());
  },
};
