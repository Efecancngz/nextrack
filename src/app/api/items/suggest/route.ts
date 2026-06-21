import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return successResponse([]);
  }

  const items = await prisma.item.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    orderBy: { title: "asc" },
    take: 8,
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
