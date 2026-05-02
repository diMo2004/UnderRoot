import Link from "next/link";
import { ArrowRight, Sparkles, Maximize2, LayoutGrid } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ivy-bg flex flex-col relative text-ivy-text selection:bg-ivy-accent/30 selection:text-ivy-text">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ivy-text rounded-xl flex items-center justify-center text-ivy-bg font-bold text-xl">
            U
          </div>
          <span className="text-2xl font-bold tracking-tight">UnderRoot</span>
        </div>
        <Link
          href="/login"
          className="bg-ivy-button text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-ivy-text/90 transition-colors shadow-md"
        >
          JOIN NOW
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="text-center max-w-5xl">
          <h1 className="text-7xl md:text-[6.5rem] leading-[1.1] font-serif font-bold text-ivy-text tracking-tight mb-8">
            The canvas for
            <br />
            <span className="text-ivy-accent">serious</span> research.
          </h1>
          
          <p className="text-xl md:text-2xl text-ivy-text/70 max-w-3xl mx-auto mb-12 font-medium">
            Build your papers with real-time AI assistance. Conflict-free editing,
            automatic citations, and institutional-grade checking.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="bg-ivy-button text-ivy-bg px-8 py-4 rounded-xl text-lg font-bold hover:bg-ivy-text/90 transition-colors shadow-lg flex items-center gap-2"
            >
              GET STARTED <ArrowRight size={20} strokeWidth={2.5} />
            </Link>
            <Link
              href="/docs"
              className="bg-transparent text-ivy-text border-[1.5px] border-ivy-text/20 px-8 py-4 rounded-xl text-lg font-bold hover:bg-ivy-text/5 transition-colors"
            >
              WATCH DEMO
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Toolbar on Right */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 bg-ivy-text text-white p-2 rounded-[2rem] flex flex-col gap-3 shadow-2xl">
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
          <LayoutGrid size={20} />
        </button>
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors relative">
          <Sparkles size={20} />
          <div className="absolute top-1 right-1 w-2 h-2 bg-ivy-accent rounded-full animate-pulse" />
        </button>
        <button className="p-3 hover:bg-white/10 rounded-full transition-colors">
          <Maximize2 size={20} />
        </button>
      </div>

      {/* Theme Pill Navigation at Bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
        <div className="bg-[#B0B0B0]/40 backdrop-blur-md p-1.5 rounded-full flex items-center justify-between text-sm font-bold text-black/40">
          {["AI LAB", "ZEN", "SAAS", "CYBER", "IVY", "NORD", "VELVET"].map((theme) => (
            <button
              key={theme}
              className={`px-6 py-3 rounded-full transition-all duration-300 ${
                theme === "IVY"
                  ? "bg-white text-ivy-text shadow-sm"
                  : "hover:bg-white/20 hover:text-black/60"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
