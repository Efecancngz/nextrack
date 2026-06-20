import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { setDefaultKeywordSchema } from "@/lib/validations/search-keywords";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getOwnedKeyword(id: string, userId: string) {
  const keyword = await prisma.searchKeyword.findUnique({ where: { id } });
  if (!keyword || keyword.userId !== userId) {
    throw AppError.notFound("Search keyword");
  }
  return keyword;
}

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedKeyword(id, user.id);

  await prisma.searchKeyword.delete({ where: { id } });

  return successResponse({ id });
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  await getOwnedKeyword(id, user.id);

  const body = await req.json().catch(() => null);
  const parsed = setDefaultKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const [, updated] = await prisma.$transaction([
    prisma.searchKeyword.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.searchKeyword.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return successResponse(updated);
}

export const DELETE = compose(withErrorHandler, withRateLimit)(deleteHandler);
export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
