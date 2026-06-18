import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import { AppError } from "@/lib/utils/app-error";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

describe("middleware", () => {
  describe("compose", () => {
    it("should execute middlewares from right to left", async () => {
      const order: string[] = [];

      const mw1 = (handler: RouteHandler): RouteHandler => async (req, ctx) => {
        order.push("mw1-start");
        const res = await handler(req, ctx);
        order.push("mw1-end");
        return res;
      };

      const mw2 = (handler: RouteHandler): RouteHandler => async (req, ctx) => {
        order.push("mw2-start");
        const res = await handler(req, ctx);
        order.push("mw2-end");
        return res;
      };

      const baseHandler: RouteHandler = async () => {
        order.push("handler");
        return new Response("ok");
      };

      const composed = compose(mw1, mw2)(baseHandler);
      await composed(new NextRequest("http://localhost/api"), { params: Promise.resolve({}) });

      expect(order).toEqual([
        "mw1-start",
        "mw2-start",
        "handler",
        "mw2-end",
        "mw1-end",
      ]);
    });
  });

  describe("withErrorHandler", () => {
    it("should return operational error details when an AppError is thrown", async () => {
      const handler: RouteHandler = async () => {
        throw AppError.notFound("Anime");
      };

      const protectedHandler = withErrorHandler(handler);
      const req = new NextRequest("http://localhost/api");
      const res = await protectedHandler(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Anime not found",
      });
    });

    it("should return a 500 error when an unexpected error is thrown", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler: RouteHandler = async () => {
        throw new Error("Db crash");
      };

      const protectedHandler = withErrorHandler(handler);
      const req = new NextRequest("http://localhost/api");
      const res = await protectedHandler(req, { params: Promise.resolve({}) });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("withRateLimit", () => {
    it("should allow requests under the limit", async () => {
      const handler = vi.fn().mockResolvedValue(new Response("ok"));
      const rateLimitedHandler = withRateLimit(handler, 2, 1000);

      const req = new NextRequest("http://localhost/api");
      req.headers.set("x-forwarded-for", "1.1.1.1");

      const res1 = await rateLimitedHandler(req, { params: Promise.resolve({}) });
      expect(res1.status).toBe(200);

      const res2 = await rateLimitedHandler(req, { params: Promise.resolve({}) });
      expect(res2.status).toBe(200);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should throw rateLimited error when limit is exceeded", async () => {
      const handler = vi.fn().mockResolvedValue(new Response("ok"));
      // limit is 1 request per second
      const rateLimitedHandler = withRateLimit(handler, 1, 1000);

      const req = new NextRequest("http://localhost/api");
      req.headers.set("cf-connecting-ip", "2.2.2.2");

      const res = await rateLimitedHandler(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);

      await expect(
        rateLimitedHandler(req, { params: Promise.resolve({}) })
      ).rejects.toThrowError(AppError);
    });
  });
});
