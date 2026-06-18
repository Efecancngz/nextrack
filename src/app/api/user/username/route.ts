import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/helpers";
import { AppError } from "@/lib/utils/app-error";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, compose } from "@/lib/utils/middleware";

const USERNAME_REGEX = /^[a-z0-9_]+$/;

async function handler(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    throw AppError.unauthorized("You must be logged in to set a username");
  }

  const body = await req.json().catch(() => null);
  const username = body?.username;

  if (!username || typeof username !== "string") {
    throw AppError.badRequest("Username is required");
  }

  const cleanedUsername = username.trim().toLowerCase();

  // Validate format and length
  if (cleanedUsername.length < 3 || cleanedUsername.length > 20) {
    throw AppError.badRequest("Username must be between 3 and 20 characters");
  }

  if (!USERNAME_REGEX.test(cleanedUsername)) {
    throw AppError.badRequest("Username can only contain lowercase letters, numbers, and underscores");
  }

  // Check if username is already taken
  const existingUser = await prisma.user.findUnique({
    where: { username: cleanedUsername },
  });

  if (existingUser) {
    // If the username is already taken by a different user
    if (existingUser.id !== user.id) {
      throw AppError.conflict("This username is already taken");
    }
    // If the user already has this username set, just return success
    return successResponse({ username: cleanedUsername });
  }

  // Update the user's username
  await prisma.user.update({
    where: { id: user.id },
    data: { username: cleanedUsername },
  });

  return successResponse({ username: cleanedUsername });
}

export const POST = compose(withErrorHandler)(handler);
