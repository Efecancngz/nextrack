import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, Responses } from "@/lib/utils/api-response";

describe("api-response", () => {
  describe("successResponse", () => {
    it("should return a success Response with default 200 status", async () => {
      const data = { foo: "bar" };
      const response = successResponse(data);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({
        success: true,
        data,
      });
    });

    it("should return a success Response with custom status", () => {
      const response = successResponse({ ok: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe("errorResponse", () => {
    it("should return an error Response with default 500 status", async () => {
      const response = errorResponse("Something failed");

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        success: false,
        error: "Something failed",
      });
    });

    it("should include details when provided", async () => {
      const details = { field: "email is invalid" };
      const response = errorResponse("Validation error", 400, details);

      const json = await response.json();
      expect(json).toEqual({
        success: false,
        error: "Validation error",
        details,
      });
    });
  });

  describe("Responses factories", () => {
    it("should generate notFound response", async () => {
      const res = Responses.notFound("Series");
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Series not found");
    });

    it("should generate unauthorized response", async () => {
      const res = Responses.unauthorized();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized — please log in");
    });

    it("should generate forbidden response", async () => {
      const res = Responses.forbidden();
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Forbidden — you do not have access");
    });

    it("should generate badRequest response", async () => {
      const res = Responses.badRequest("Custom message");
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Custom message");
    });

    it("should generate validationError response", async () => {
      const errors = { name: "Required" };
      const res = Responses.validationError(errors);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Validation failed");
      expect(json.details).toEqual(errors);
    });

    it("should generate internalError response from Error instance", async () => {
      const err = new Error("Db connection timed out");
      const res = Responses.internalError(err);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Db connection timed out");
    });

    it("should generate internalError response from general string/unknown", async () => {
      const res = Responses.internalError("Something wrong");
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("An unexpected error occurred");
    });
  });
});
