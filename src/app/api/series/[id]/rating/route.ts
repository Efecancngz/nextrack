import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { getOrCreateSeriesFromCompoundId } from "@/lib/db/series-cache";
import { rateSeriesSchema } from "@/lib/validations/library";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function putHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = rateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const series = await getOrCreateSeriesFromCompoundId(id);
  const { score, review } = parsed.data;

  const rating = await prisma.userRating.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId: series.id } },
    create: { userId: user.id, seriesId: series.id, score, review },
    update: { score, review },
  });

  return successResponse(rating);
}

export const PUT = compose(withErrorHandler, withRateLimit)(putHandler);
