import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { getOrCreateSeriesFromCompoundId } from "@/lib/db/series-cache";
import { addToLibrarySchema, libraryStatusEnum } from "@/lib/validations/library";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import { Prisma } from "@/generated/prisma/client";

async function getHandler(req: NextRequest) {
  const user = await requireAuth();
  const rawStatus = req.nextUrl.searchParams.get("status");

  let statusFilter: ReturnType<typeof libraryStatusEnum.parse> | undefined;
  if (rawStatus !== null) {
    const parsedStatus = libraryStatusEnum.safeParse(rawStatus);
    if (!parsedStatus.success) {
      return Responses.badRequest("Invalid status filter");
    }
    statusFilter = parsedStatus.data;
  }

  const items = await prisma.libraryItem.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { series: true },
    orderBy: { updatedAt: "desc" },
  });

  return successResponse(items);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => null);
  const parsed = addToLibrarySchema.safeParse(body);

  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { seriesId, status } = parsed.data;
  const series = await getOrCreateSeriesFromCompoundId(seriesId);

  try {
    const item = await prisma.libraryItem.create({
      data: { userId: user.id, seriesId: series.id, status },
    });
    return successResponse(item, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("This series is already in your library");
    }
    throw err;
  }
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
