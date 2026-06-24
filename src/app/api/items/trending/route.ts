import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const items = await prisma.item.findMany({
    where: { status: "ONGOING" },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
