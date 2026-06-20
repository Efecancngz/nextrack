interface BuildRedirectUrlInput {
  title: string;
  progress?: { label: "episode" | "chapter"; value: number } | null;
  keyword?: string | null;
}

export function buildRedirectUrl({ title, progress, keyword }: BuildRedirectUrlInput): string {
  const parts = [title];
  if (progress) {
    const capitalized = progress.label === "episode" ? "Episode" : "Chapter";
    parts.push(`${capitalized} ${progress.value}`);
  }
  if (keyword) {
    parts.push(keyword);
  }
  const query = parts.join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
