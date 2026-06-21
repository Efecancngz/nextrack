import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { rateItemSchema } from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function putHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  const body = await req.json().catch(() => null);
  const parsed = rateItemSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { score, review } = parsed.data;
  const rating = await prisma.rating.upsert({
    where: { userId_itemId: { userId: user.id, itemId: id } },
    create: { userId: user.id, itemId: id, score, review },
    update: { score, review },
  });

  return successResponse(rating);
}

export const PUT = compose(withErrorHandler, withRateLimit)(putHandler);
