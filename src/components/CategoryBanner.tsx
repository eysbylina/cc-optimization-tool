"use client";

interface Props {
  stats: {
    total: number;
    fromStatement: number;
    autoAssigned: number;
    uncategorized: number;
  };
}

export default function CategoryBanner({ stats }: Props) {
  if (stats.total === 0) return null;

  const allFromStatement = stats.autoAssigned === 0 && stats.uncategorized === 0;

  return (
    <div className="mb-4 p-3 rounded-md border border-border bg-surface text-sm">
      <p className="font-semibold mb-1.5">Category Sources</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="text-muted">
          <strong className="text-text">{stats.total}</strong> total charges
        </span>

        {stats.fromStatement > 0 && (
          <span className="text-positive">
            <strong>{stats.fromStatement}</strong> categorized by your bank
          </span>
        )}

        {stats.autoAssigned > 0 && (
          <span className="text-accent">
            <strong>{stats.autoAssigned}</strong> auto-assigned from merchant
            name
            <span className="opacity-60 ml-1" title="Auto-assigned">
              ✦
            </span>
          </span>
        )}

        {stats.uncategorized > 0 && (
          <span className="text-muted">
            <strong className="text-negative">{stats.uncategorized}</strong>{" "}
            uncategorized
          </span>
        )}
      </div>

      {allFromStatement && (
        <p className="text-xs text-muted mt-1.5">
          All categories came directly from your statement — no guessing needed.
        </p>
      )}

      {stats.autoAssigned > 0 && (
        <p className="text-xs text-muted mt-1.5">
          Transactions marked with{" "}
          <span className="text-accent">✦</span> had no category in your
          statement, so we assigned one based on the merchant name. These may
          not be 100% accurate.
        </p>
      )}
    </div>
  );
}
