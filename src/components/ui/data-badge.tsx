export function DataBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "yellow" | "red" | "neutral" | "orange" }) {
  return <span className={`data-badge badge-${tone}`}>{children}</span>;
}
