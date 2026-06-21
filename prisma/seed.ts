import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { EXAMPLE_ITEMS } from "../src/lib/api/example-source";

const connectionString = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  for (const item of EXAMPLE_ITEMS) {
    await prisma.item.upsert({
      where: { externalId_source: { externalId: item.externalId, source: "example-source" } },
      create: {
        externalId: item.externalId,
        source: "example-source",
        category: item.category,
        status: item.status,
        title: item.title,
        description: item.description,
        totalUnits: item.totalUnits,
      },
      update: {
        category: item.category,
        status: item.status,
        title: item.title,
        description: item.description,
        totalUnits: item.totalUnits,
      },
    });
  }
  console.log(`Seeded ${EXAMPLE_ITEMS.length} items.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
