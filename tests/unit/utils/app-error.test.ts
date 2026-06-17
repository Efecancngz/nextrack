import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/utils/app-error";

describe("AppError", () => {
  it("should create an AppError instance with default properties", () => {
    const error = new AppError("Test error");
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Test error");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.isOperational).toBe(true);
  });

  it("should support custom status codes and error codes", () => {
    const error = new AppError("Custom error", 400, "BAD_REQUEST");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("should create a notFound error", () => {
    const error = AppError.notFound("User");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("User not found");
  });

  it("should create an unauthorized error", () => {
    const error = AppError.unauthorized("Sign in required");
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Sign in required");
  });

  it("should create a forbidden error", () => {
    const error = AppError.forbidden("No access");
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("No access");
  });

  it("should create a badRequest error", () => {
    const error = AppError.badRequest("Malformed payload");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Malformed payload");
  });

  it("should create a validationError error", () => {
    const error = AppError.validationError("Invalid fields");
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Invalid fields");
  });

  it("should create a rateLimited error", () => {
    const error = AppError.rateLimited();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toBe("Too many requests");
  });

  it("should create an externalApiError error", () => {
    const error = AppError.externalApiError("TMDB");
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe("EXTERNAL_API_ERROR");
    expect(error.message).toBe("External API error from TMDB");
  });

  it("should verify isAppError checks correctly", () => {
    const appError = AppError.notFound();
    const standardError = new Error("Standard error");
    const plainObject = { message: "error" };

    expect(AppError.isAppError(appError)).toBe(true);
    expect(AppError.isAppError(standardError)).toBe(false);
    expect(AppError.isAppError(plainObject)).toBe(false);
    expect(AppError.isAppError(null)).toBe(false);
  });
});
