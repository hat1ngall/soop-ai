import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="mb-4 text-6xl font-bold text-gray-800">404</div>
        <h1 className="mb-2 text-xl font-semibold text-gray-200">Страница не найдена</h1>
        <p className="mb-6 text-sm text-gray-500">
          Возможно, страница была перемещена или удалена.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
