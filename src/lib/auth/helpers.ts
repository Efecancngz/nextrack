import { auth } from "@/lib/auth/config";
import { AppError } from "@/lib/utils/app-error";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw AppError.unauthorized();
  }
  return user;
}
