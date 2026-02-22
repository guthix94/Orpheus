import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Orpheus
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Intelligent lesson documentation for music educators
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/lesson/record"
            className="rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Start Lesson
          </Link>
          <Link
            href="/students"
            className="rounded-xl bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            View Students
          </Link>
        </div>
      </div>
    </div>
  );
}
