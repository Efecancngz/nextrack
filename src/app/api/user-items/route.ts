import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { addToTrackingSchema, trackingStatusEnum } from "@/lib/validations/item";
import { AppError } from "@/lib/utils/app-error";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";
import { Prisma } from "@/generated/prisma/client";

async function getHandler(req: NextRequest) {
  const user = await requireAuth();
  const rawStatus = req.nextUrl.searchParams.get("status");

  let statusFilter: ReturnType<typeof trackingStatusEnum.parse> | undefined;
  if (rawStatus !== null) {
    const parsedStatus = trackingStatusEnum.safeParse(rawStatus);
    if (!parsedStatus.success) {
      return Responses.badRequest("Invalid status filter");
    }
    statusFilter = parsedStatus.data;
  }

  const items = await prisma.userItem.findMany({
    where: {
      userId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { item: true },
    orderBy: { updatedAt: "desc" },
  });

  return successResponse(items);
}

async function postHandler(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => null);
  const parsed = addToTrackingSchema.safeParse(body);

  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const { itemId, status } = parsed.data;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw AppError.notFound("Item");
  }

  try {
    const userItem = await prisma.userItem.create({
      data: { userId: user.id, itemId, status },
    });
    return successResponse(userItem, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("This item is already in your tracking list");
    }
    throw err;
  }
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
