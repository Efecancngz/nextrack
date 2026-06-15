export default function HomePage() {
  return (
    <main className="container-content py-16 page-enter">
      <div className="text-center space-y-4">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            background: "linear-gradient(135deg, #f0f2f7 0%, #9aa3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Track Every Series.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, var(--color-brand) 0%, var(--color-accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Find Where to Watch.
          </span>
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "1.125rem",
            maxWidth: "42ch",
            margin: "0 auto",
          }}
        >
          TV Series, Anime, Manga, Manhwa, Light Novels & Webtoons — all in one
          place. 100% free, 0% piracy.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 8 }}>
          <a href="/explore" className="btn btn-primary btn-lg">
            Start Exploring
          </a>
          <a href="/library" className="btn btn-secondary btn-lg">
            My Library
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: 80,
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 14,
        }}
      >
        🚀 Core infrastructure ready. Coming next: Search, Anime cards, Library...
      </div>
    </main>
  );
}
