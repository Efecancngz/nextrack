export interface ExampleItem {
  externalId: string;
  title: string;
  description: string;
  category: "TYPE_A" | "TYPE_B" | "TYPE_C";
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UPCOMING";
  totalUnits: number;
}

export const EXAMPLE_ITEMS: ExampleItem[] = [
  { externalId: "ex-001", title: "The Starlight Archive", description: "A long-running ongoing project followed by a dedicated community.", category: "TYPE_A", status: "ONGOING", totalUnits: 142 },
  { externalId: "ex-002", title: "Midnight Protocol", description: "A completed, highly rated piece of work.", category: "TYPE_A", status: "COMPLETED", totalUnits: 24 },
  { externalId: "ex-003", title: "Garden of Echoes", description: "Currently on hiatus after a strong opening run.", category: "TYPE_B", status: "HIATUS", totalUnits: 8 },
  { externalId: "ex-004", title: "Iron Tide", description: "A fast-growing ongoing release with frequent updates.", category: "TYPE_B", status: "ONGOING", totalUnits: 56 },
  { externalId: "ex-005", title: "Paper Moon Society", description: "An upcoming release generating early buzz.", category: "TYPE_C", status: "UPCOMING", totalUnits: 0 },
  { externalId: "ex-006", title: "Lighthouse at the End", description: "A completed classic with a small but devoted following.", category: "TYPE_C", status: "COMPLETED", totalUnits: 12 },
  { externalId: "ex-007", title: "The Quiet Algorithm", description: "An ongoing technical deep-dive series.", category: "TYPE_A", status: "ONGOING", totalUnits: 33 },
  { externalId: "ex-008", title: "Velvet Horizon", description: "Cancelled after a short run, still discussed by fans.", category: "TYPE_B", status: "CANCELLED", totalUnits: 6 },
  { externalId: "ex-009", title: "Glass Orchard", description: "A steady, ongoing weekly release.", category: "TYPE_C", status: "ONGOING", totalUnits: 91 },
  { externalId: "ex-010", title: "Static Bloom", description: "A completed limited run, well-reviewed.", category: "TYPE_A", status: "COMPLETED", totalUnits: 18 },
  { externalId: "ex-011", title: "Northern Static", description: "An ongoing release with a recent surge in popularity.", category: "TYPE_B", status: "ONGOING", totalUnits: 47 },
  { externalId: "ex-012", title: "The Long Recess", description: "On hiatus, last update several months ago.", category: "TYPE_C", status: "HIATUS", totalUnits: 21 },
];

export async function searchExampleItems(query: string): Promise<ExampleItem[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return EXAMPLE_ITEMS.filter((item) => item.title.toLowerCase().includes(normalized));
}

export async function getExampleItemDetail(externalId: string): Promise<ExampleItem | null> {
  return EXAMPLE_ITEMS.find((item) => item.externalId === externalId) ?? null;
}

export async function getTrendingExampleItems(): Promise<ExampleItem[]> {
  return EXAMPLE_ITEMS.filter((item) => item.status === "ONGOING").slice(0, 8);
}

export async function simulateExampleItemUpdate(externalId: string): Promise<number | null> {
  const item = EXAMPLE_ITEMS.find((i) => i.externalId === externalId);
  if (!item) return null;
  item.totalUnits += 1;
  return item.totalUnits;
}
