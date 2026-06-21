import { describe, it, expect } from "vitest";
import {
  EXAMPLE_ITEMS,
  searchExampleItems,
  getExampleItemDetail,
  getTrendingExampleItems,
  simulateExampleItemUpdate,
} from "@/lib/api/example-source";

describe("example-source", () => {
  it("has at least 10 seed items across all 3 categories", () => {
    expect(EXAMPLE_ITEMS.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(EXAMPLE_ITEMS.map((i) => i.category));
    expect(categories).toEqual(new Set(["TYPE_A", "TYPE_B", "TYPE_C"]));
  });

  it("searchExampleItems matches by case-insensitive title substring", async () => {
    const results = await searchExampleItems(EXAMPLE_ITEMS[0].title.slice(0, 4).toUpperCase());
    expect(results.some((r) => r.externalId === EXAMPLE_ITEMS[0].externalId)).toBe(true);
  });

  it("searchExampleItems returns an empty array for no match", async () => {
    const results = await searchExampleItems("zzz-no-such-title-zzz");
    expect(results).toEqual([]);
  });

  it("getExampleItemDetail returns the matching item by externalId", async () => {
    const target = EXAMPLE_ITEMS[0];
    const result = await getExampleItemDetail(target.externalId);
    expect(result).not.toBeNull();
    expect(result?.title).toBe(target.title);
  });

  it("getExampleItemDetail returns null for an unknown externalId", async () => {
    const result = await getExampleItemDetail("does-not-exist");
    expect(result).toBeNull();
  });

  it("getTrendingExampleItems returns a non-empty subset of EXAMPLE_ITEMS", async () => {
    const results = await getTrendingExampleItems();
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(EXAMPLE_ITEMS.length);
  });

  it("simulateExampleItemUpdate increments totalUnits and returns the new value", async () => {
    const target = EXAMPLE_ITEMS[0];
    const before = target.totalUnits;
    const result = await simulateExampleItemUpdate(target.externalId);
    expect(result).toBe(before + 1);
    expect(target.totalUnits).toBe(before + 1);
  });

  it("simulateExampleItemUpdate returns null for an unknown externalId", async () => {
    const result = await simulateExampleItemUpdate("does-not-exist");
    expect(result).toBeNull();
  });
});
