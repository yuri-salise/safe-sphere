import Link from "next/link";

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextItems: string[];
};

export function ModulePage({
  eyebrow,
  title,
  description,
  nextItems,
}: ModulePageProps) {
  return (
    <section className="dashboard-content page-enter">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p className="lede">{description}</p>

      <div className="module-placeholder">
        <div>
          <span className="status-pill status-neutral">Operational workflow</span>
          <h2>Workflow workspace</h2>
          <p>
            This workspace groups the core actions and records required for this area of
            emergency operations.
          </p>
        </div>
        <ol className="next-list">
          {nextItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <Link href="/dashboard" className="text-link">
        ← Return to operations overview
      </Link>
    </section>
  );
}
