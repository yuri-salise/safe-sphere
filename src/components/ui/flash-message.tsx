type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function FlashMessage({ searchParams }: { searchParams?: SearchParams }) {
  const error = single(searchParams?.error);
  const success = single(searchParams?.success);

  if (!error && !success) return null;

  return (
    <div className={`flash-message ${error ? "flash-error" : "flash-success"}`} role="status">
      {error ?? success}
    </div>
  );
}
