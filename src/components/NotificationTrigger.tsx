"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export default function NotificationTrigger() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications/check", { method: "POST" }).catch(() => {
      // silent — a failed background check is invisible to the user, not an error state
    });
  }, [session?.user]);

  return null;
}
