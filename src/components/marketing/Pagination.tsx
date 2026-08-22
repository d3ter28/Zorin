type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => (page <= 1 ? basePath : `${basePath}?page=${page}`);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-4"
    >
      {currentPage > 1 ? (
        <a
          href={pageHref(currentPage - 1)}
          className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          ← Previous
        </a>
      ) : (
        <span className="inline-flex h-9 items-center rounded-lg border border-zinc-100 px-4 text-sm font-medium text-zinc-300">
          ← Previous
        </span>
      )}

      <span className="text-sm text-zinc-500">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <a
          href={pageHref(currentPage + 1)}
          className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          Next →
        </a>
      ) : (
        <span className="inline-flex h-9 items-center rounded-lg border border-zinc-100 px-4 text-sm font-medium text-zinc-300">
          Next →
        </span>
      )}
    </nav>
  );
}
