import { Button } from "./Button";

export function Pagination({
  total,
  page,
  perPage,
  onPageChange,
}: {
  total: number;
  perPage: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.floor((total - 1) / perPage) + 1;
  return (
    <div className="mt-2 flex flex-col items-end">
      <span className="text-surface-700 dark:text-surface-400 text-sm">
        Showing page {numText(page + 1)} of {numText(totalPages)}
      </span>
      <div className="xs:mt-0 mt-2 inline-flex gap-2">
        <Button
          className="inline-flex items-center"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <i className="fa fa-arrow-left mr-1 w-5" />
          Prev
        </Button>
        <Button
          className="inline-flex items-center"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <i className="fa fa-arrow-right ml-1 w-5" />
        </Button>
      </div>
    </div>
  );

  function numText(value: number) {
    return (
      <span className="text-surface-900 font-semibold dark:text-white">
        {value}
      </span>
    );
  }
}
