export default function Loading() {
  return (
    <div className="byc-scroll" style={{ padding: "18px" }}>
      <div style={{ width: "100%", aspectRatio: "3 / 4", background: "var(--surface)", borderRadius: "var(--radius-lg)", marginBottom: 22 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 12px" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--surface)", borderRadius: "var(--radius)" }} />
            <div style={{ height: 12, width: "60%", background: "var(--surface)", borderRadius: 4, marginTop: 10 }} />
            <div style={{ height: 12, width: "85%", background: "var(--surface)", borderRadius: 4, marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
