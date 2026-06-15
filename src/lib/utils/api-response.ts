import type { ApiResponse } from "@/types/common";

/** Return a success JSON response */
export function successResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return Response.json(body, { status });
}

/** Return an error JSON response */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: message,
    ...(details ? { details } : {}),
  };
  return Response.json(body, { status });
}

/** Common HTTP error responses */
export const Responses = {
  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, 404),

  unauthorized: () =>
    errorResponse("Unauthorized — please log in", 401),

  forbidden: () =>
    errorResponse("Forbidden — you do not have access", 403),

  badRequest: (message = "Invalid request body") =>
    errorResponse(message, 400),

  validationError: (errors: unknown) =>
    errorResponse("Validation failed", 422, errors),

  internalError: (err?: unknown) => {
    const msg =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return errorResponse(msg, 500);
  },
} as const;
