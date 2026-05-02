import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">📝 UnderRoot</h1>
        <p className="text-xl text-gray-600 mb-2">
          AI-Powered Real-Time Collaborative Research Paper Writing
        </p>
        <p className="text-gray-500 mb-10">
          Write. Cite. Check. Collaborate — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started
          </Link>
          <Link
            href="/docs"
            className="bg-white text-gray-700 border border-gray-300 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-colors shadow"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">✍️</div>
            <h3 className="font-semibold text-gray-800 mb-1">Real-Time Collaboration</h3>
            <p className="text-sm text-gray-500">
              Co-author papers with your team using conflict-free CRDT editing.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-800 mb-1">AI Citation Suggestions</h3>
            <p className="text-sm text-gray-500">
              Automatically detect claims and find the most relevant papers.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="font-semibold text-gray-800 mb-1">Plagiarism Detection</h3>
            <p className="text-sm text-gray-500">
              Three-layer analysis: lexical, semantic, and structural similarity.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
