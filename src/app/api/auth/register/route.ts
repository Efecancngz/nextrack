/**
 * POST /api/auth/register — Create a new email/password user.
 *
 * Does not sign the user in. On success the client redirects to
 * /auth/signin so the credentials flow (Task 4) handles the session.
 */

import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, compose } from "@/lib/utils/middleware";

const SALT_ROUNDS = 10;

async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return successResponse({ id: user.id, email: user.email, name: user.name }, 201);
}

export const POST = compose(withErrorHandler)(handler);
