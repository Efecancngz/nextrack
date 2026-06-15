/**
 * AppError — Custom error class for structured error handling.
 *
 * Usage:
 *   throw AppError.notFound("Series not found");
 *   throw AppError.unauthorized();
 *   throw new AppError("Custom message", 400, "CUSTOM_CODE");
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  // ─── Factory Methods ───
  static notFound(resource = "Resource"): AppError {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }

  static unauthorized(message = "Unauthorized — please log in"): AppError {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have access"): AppError {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static badRequest(message = "Invalid request"): AppError {
    return new AppError(message, 400, "BAD_REQUEST");
  }

  static validationError(message = "Validation failed"): AppError {
    return new AppError(message, 422, "VALIDATION_ERROR");
  }

  static rateLimited(): AppError {
    return new AppError("Too many requests", 429, "RATE_LIMITED");
  }

  static externalApiError(api: string): AppError {
    return new AppError(`External API error from ${api}`, 502, "EXTERNAL_API_ERROR");
  }

  /** Check if an unknown error is operational (expected) */
  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError && err.isOperational;
  }
}
