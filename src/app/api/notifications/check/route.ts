import { requireAuth } from "@/lib/auth/helpers";
import { checkForItemUpdates } from "@/lib/notifications";
import { successResponse } from "@/lib/utils/api-response";
import { withErrorHandler, withRateLimit, compose } from "@/lib/utils/middleware";

async function postHandler() {
  const user = await requireAuth();
  const result = await checkForItemUpdates(user.id);
  return successResponse(result);
}

export const POST = compose(withErrorHandler, withRateLimit)(postHandler);
