import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Docs</h1>
      <p className="mt-2 text-gray-600">Docs route is working.</p>

      <div className="mt-6">
        <Link className="text-blue-600 underline" href="/">
          Back to Home
        </Link>
      </div>
    </main>
  );
}