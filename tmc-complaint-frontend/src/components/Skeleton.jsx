export function Skeleton({ width = "100%", height = "20px", borderRadius = "var(--radius-sm)", style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="120px" height="18px" />
        <Skeleton width="80px" height="22px" borderRadius="var(--radius-full)" />
      </div>
      <Skeleton width="70%" height="24px" />
      <Skeleton width="100%" height="16px" />
      <Skeleton width="90%" height="16px" />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-2)" }}>
        <Skeleton width="100px" height="14px" />
        <Skeleton width="80px" height="14px" />
      </div>
    </div>
  );
}
