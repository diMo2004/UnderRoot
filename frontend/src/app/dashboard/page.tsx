import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Dashboard route is working.</p>

      <div className="mt-6">
        <Link className="text-blue-600 underline" href="/">
          Back to Home
        </Link>
      </div>
    </main>
  );
}