type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

const linkClass =
  "inline-flex h-9 items-center border border-line bg-surface px-4 font-mono text-xs text-accent transition-colors hover:border-ink";
const disabledClass =
  "inline-flex h-9 items-center border border-line px-4 font-mono text-xs text-line-strong";

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => (page <= 1 ? basePath : `${basePath}?page=${page}`);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      {currentPage > 1 ? (
        <a href={pageHref(currentPage - 1)} className={linkClass}>
          ← Previous
        </a>
      ) : (
        <span className={disabledClass}>← Previous</span>
      )}

      <span className="font-mono text-xs text-faint">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <a href={pageHref(currentPage + 1)} className={linkClass}>
          Next →
        </a>
      ) : (
        <span className={disabledClass}>Next →</span>
      )}
    </nav>
  );
}
