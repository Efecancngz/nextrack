import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateProgressSchema } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) {
    throw AppError.notFound("Library item");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProgressSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.libraryItem.update({
    where: { id },
    data: parsed.data,
  });

  return successResponse(updated);
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
