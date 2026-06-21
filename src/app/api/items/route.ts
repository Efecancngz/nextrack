import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const category = req.nextUrl.searchParams.get("category");
  const status = req.nextUrl.searchParams.get("status");

  const items = await prisma.item.findMany({
    where: {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(category ? { category: category as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { title: "asc" },
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
