import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockTransaction = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args), update: (...args: unknown[]) => mockUpdate(...args) },
    userItem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    notification: { create: vi.fn() },
    item: { update: vi.fn() },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/api/example-source", () => ({
  simulateExampleItemUpdate: vi.fn(),
}));

import { checkForItemUpdates } from "@/lib/notifications";
import { simulateExampleItemUpdate } from "@/lib/api/example-source";

describe("checkForItemUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockResolvedValue([{}, {}]);
    mockUpdate.mockResolvedValue({});
  });

  it("returns created: 0 when notifications are disabled", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: false, lastNotificationCheckAt: null });

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns created: 0 when throttled (checked less than an hour ago)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      notificationsEnabled: true,
      lastNotificationCheckAt: new Date(),
    });

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("creates a notification when an item's totalUnits increased", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: true, lastNotificationCheckAt: null });
    mockFindMany.mockResolvedValue([
      { id: "ui1", item: { id: "item1", externalId: "ex-001", title: "The Starlight Archive", totalUnits: 142 } },
    ]);
    vi.mocked(simulateExampleItemUpdate).mockResolvedValue(143);

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 1 });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not create a notification when totalUnits is unchanged", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", notificationsEnabled: true, lastNotificationCheckAt: null });
    mockFindMany.mockResolvedValue([
      { id: "ui1", item: { id: "item1", externalId: "ex-001", title: "The Starlight Archive", totalUnits: 142 } },
    ]);
    vi.mocked(simulateExampleItemUpdate).mockResolvedValue(142);

    const result = await checkForItemUpdates("u1");

    expect(result).toEqual({ created: 0 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
