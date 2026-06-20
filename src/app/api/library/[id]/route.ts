import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateLibraryStatusSchema, updateFavoriteSchema, updateWaitLanguageSchema } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedItem(id: string, userId: string) {
  const item = await prisma.libraryItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw AppError.notFound("Library item");
  }
  return item;
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedItem(id, user.id);

  const body = await req.json().catch(() => null);

  const statusParsed = updateLibraryStatusSchema.safeParse(body);
  if (statusParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { status: statusParsed.data.status },
    });
    return successResponse(updated);
  }

  const favoriteParsed = updateFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  const waitLanguageParsed = updateWaitLanguageSchema.safeParse(body);
  if (waitLanguageParsed.success) {
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { waitLanguage: waitLanguageParsed.data.waitLanguage },
    });
    return successResponse(updated);
  }

  return Responses.validationError(statusParsed.error.flatten().fieldErrors);
}

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedItem(id, user.id);

  await prisma.libraryItem.delete({ where: { id } });

  return successResponse({ id });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
