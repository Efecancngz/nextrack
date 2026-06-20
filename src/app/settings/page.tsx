import React from "react";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";
import SearchKeywordManager from "@/components/SearchKeywordManager";
import type { SearchKeyword } from "@/types/search-keyword";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your search keywords",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAuth();

  const rows = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const keywords: SearchKeyword[] = rows.map((k) => ({
    id: k.id,
    userId: k.userId,
    label: k.label,
    isDefault: k.isDefault,
    createdAt: k.createdAt.toISOString(),
  }));

  return (
    <div className="container-content page-enter">
      <h1 className="library-title">Settings</h1>
      <section className="settings-section">
        <h2 className="detail-section-title">Search Keywords</h2>
        <p className="settings-section-hint">
          Saved keywords are appended to the &quot;Search&quot; button on series pages and your library.
        </p>
        <SearchKeywordManager initialKeywords={keywords} />
      </section>
    </div>
  );
}
