"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  series: { source: string; externalId: string };
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      // silent — a failed fetch just leaves the existing list/badge state as-is
    }
  }

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      await fetchNotifications();
    })();
  }, [session?.user]);

  async function handleToggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      try {
        await fetch("/api/notifications/mark-read", { method: "PATCH" });
        await fetchNotifications();
      } catch {
        // silent — dropdown still opens with the last-known list; badge just won't clear this time
      }
    }
  }

  async function handleToggleEnabled() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: next }),
      });
    } catch {
      setNotificationsEnabled(!next); // roll back the optimistic toggle on failure
    }
  }

  if (!session?.user) return null;

  return (
    <div className="notification-bell-wrapper">
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleToggleOpen}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          {notifications.length === 0 ? (
            <p className="notification-dropdown-empty">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={`/series/${n.series.source}-${n.series.externalId}`}
                className="notification-dropdown-item"
                onClick={() => setOpen(false)}
              >
                {n.message}
              </Link>
            ))
          )}
          <button
            type="button"
            className="notification-dropdown-toggle"
            onClick={handleToggleEnabled}
          >
            Notifications: {notificationsEnabled ? "On" : "Off"}
          </button>
        </div>
      )}
    </div>
  );
}
