import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/helpers";
import { updateNoteSchema } from "@/lib/validations/notes";
import { successResponse, Responses } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { seriesId } = await params;

  const note = await prisma.userNote.findUnique({
    where: { userId_seriesId: { userId: user.id, seriesId } },
  });

  return successResponse({ content: note?.content ?? null });
}

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const user = await requireAuth();
  const { seriesId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Responses.validationError(parsed.error.flatten().fieldErrors);
  }

  const trimmed = parsed.data.content.trim();

  if (trimmed === "") {
    await prisma.userNote.deleteMany({ where: { userId: user.id, seriesId } });
    return successResponse({ content: null });
  }

  const note = await prisma.userNote.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId } },
    create: { userId: user.id, seriesId, content: trimmed },
    update: { content: trimmed },
  });

  return successResponse({ content: note.content });
}

export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
export const PATCH = compose(withErrorHandler, withRateLimit)(patchHandler);
