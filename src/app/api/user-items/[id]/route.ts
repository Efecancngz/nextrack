import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import {
  updateTrackingStatusSchema,
  updateTrackingFavoriteSchema,
  updateTrackingProgressSchema,
} from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedUserItem(id: string, userId: string) {
  const userItem = await prisma.userItem.findUnique({ where: { id } });
  if (!userItem || userItem.userId !== userId) {
    throw AppError.notFound("Tracking entry");
  }
  return userItem;
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedUserItem(id, user.id);

  const body = await req.json().catch(() => null);

  const statusParsed = updateTrackingStatusSchema.safeParse(body);
  if (statusParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { status: statusParsed.data.status },
    });
    return successResponse(updated);
  }

  const favoriteParsed = updateTrackingFavoriteSchema.safeParse(body);
  if (favoriteParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { isFavorite: favoriteParsed.data.isFavorite },
    });
    return successResponse(updated);
  }

  const progressParsed = updateTrackingProgressSchema.safeParse(body);
  if (progressParsed.success) {
    const updated = await prisma.userItem.update({
      where: { id },
      data: { progress: progressParsed.data.progress, notes: progressParsed.data.notes },
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

  await getOwnedUserItem(id, user.id);

  await prisma.userItem.delete({ where: { id } });

  return successResponse({ id });
}

export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
