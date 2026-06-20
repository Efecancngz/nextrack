import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { createSearchKeywordSchema } from "@/lib/validations/search-keywords";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler() {
  const user = await requireAuth();

  const keywords = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return successResponse(keywords);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();

  const body = await req.json().catch(() => null);
  const parsed = createSearchKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const existingCount = await prisma.searchKeyword.count({ where: { userId: user.id } });

  const keyword = await prisma.searchKeyword.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      isDefault: existingCount === 0,
    },
  });

  return successResponse(keyword, 201);
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
