import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { itemCategoryEnum, itemStatusEnum } from "@/lib/validations/item";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const rawCategory = req.nextUrl.searchParams.get("category");
  const rawStatus = req.nextUrl.searchParams.get("status");

  const categoryParsed = rawCategory !== null ? itemCategoryEnum.safeParse(rawCategory) : null;
  if (categoryParsed && !categoryParsed.success) {
    return Responses.badRequest("Invalid category filter");
  }

  const statusParsed = rawStatus !== null ? itemStatusEnum.safeParse(rawStatus) : null;
  if (statusParsed && !statusParsed.success) {
    return Responses.badRequest("Invalid status filter");
  }

  const items = await prisma.item.findMany({
    where: {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(categoryParsed?.success ? { category: categoryParsed.data } : {}),
      ...(statusParsed?.success ? { status: statusParsed.data } : {}),
    },
    orderBy: { title: "asc" },
  });

  return successResponse(items);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
