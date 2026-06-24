import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/app-error";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(
  req: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  return successResponse(item);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
