import type { NextRequest } from "next/server";
import { AppError } from "./app-error";
import { errorResponse } from "./api-response";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * withErrorHandler — HOF middleware that catches any thrown error and
 * returns a structured JSON error response instead of crashing the route.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (AppError.isAppError(err)) {
        return errorResponse(err.message, err.statusCode);
      }
      console.error("[Route Error]", err);
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}

/**
 * withRateLimit — Simple in-memory rate limiter per IP.
 * For production, replace with Cloudflare Rate Limiting or Upstash Redis.
 *
 * @param maxRequests - max requests per window (default: 60)
 * @param windowMs    - time window in ms (default: 60000 = 1 min)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(
  handler: RouteHandler,
  maxRequests = 60,
  windowMs = 60_000
): RouteHandler {
  return async (req, ctx) => {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for") ||
      "anonymous";

    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= maxRequests) {
      throw AppError.rateLimited();
    } else {
      record.count++;
    }

    return handler(req, ctx);
  };
}

/**
 * Compose multiple HOF middlewares (right-to-left).
 *
 * Usage:
 *   export const GET = compose(withErrorHandler, withRateLimit)(myHandler);
 */
export function compose(
  ...middlewares: ((h: RouteHandler) => RouteHandler)[]
): (handler: RouteHandler) => RouteHandler {
  return (handler) =>
    middlewares.reduceRight((acc, mw) => mw(acc), handler);
}
