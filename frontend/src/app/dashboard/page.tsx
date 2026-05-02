"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Users, 
  Settings,
  MoreVertical,
  LogOut,
  Sparkles,
  X
} from "lucide-react";
import { projectAPI } from "@/lib/api";

interface Project {
  _id: string;
  title: string;
  updatedAt: string;
  collaborators: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await projectAPI.list();
      setProjects(data || []);
    } catch (err) {
      console.warn("Backend project list failed, using mock data.");
      setProjects([
        { _id: "1", title: "Quantum Computing Architecture", updatedAt: new Date().toISOString(), collaborators: [{}, {}] },
        { _id: "2", title: "Neural Network Optimization", updatedAt: new Date().toISOString(), collaborators: [{}] },
        { _id: "3", title: "Global Economic Shifts 2026", updatedAt: new Date().toISOString(), collaborators: [{}, {}, {}] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    
    setCreating(true);
    try {
      const { data } = await projectAPI.create({ title: newProjectTitle });
      setIsModalOpen(false);
      setNewProjectTitle("");
      router.push(`/editor/${data._id}`);
    } catch (err) {
      // If backend fails, just simulate redirection for frontend demonstration
      const mockId = Math.random().toString(36).substring(7);
      router.push(`/editor/${mockId}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivy-bg flex text-ivy-text relative">
      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ivy-text/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif font-bold">New Research Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-ivy-text/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-ivy-text/40 mb-2">Project Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="e.g. The Impact of AI on Modern Ethics"
                  className="w-full bg-[#F5F2EA] border-none rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-ivy-accent transition-all"
                />
              </div>
              
              <button 
                type="submit"
                disabled={creating || !newProjectTitle.trim()}
                className="w-full bg-ivy-text text-white py-4 rounded-xl font-bold hover:bg-ivy-text/90 transition-all disabled:opacity-50"
              >
                {creating ? "Creating..." : "Start Researching"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-ivy-text/5 flex flex-col p-6 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-ivy-text rounded-lg flex items-center justify-center text-ivy-bg font-bold">
            U
          </div>
          <span className="font-bold tracking-tight">UnderRoot</span>
        </Link>

        <nav className="flex-1 flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-2.5 bg-ivy-text text-white rounded-xl text-sm font-bold shadow-md">
            <FileText size={18} /> Projects
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 text-ivy-text/50 hover:bg-ivy-text/5 hover:text-ivy-text rounded-xl text-sm font-bold transition-all">
            <Clock size={18} /> Recent
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 text-ivy-text/50 hover:bg-ivy-text/5 hover:text-ivy-text rounded-xl text-sm font-bold transition-all">
            <Users size={18} /> Shared with me
          </button>
          <div className="my-4 h-px bg-ivy-text/5" />
          <button className="flex items-center gap-3 px-4 py-2.5 text-ivy-text/50 hover:bg-ivy-text/5 hover:text-ivy-text rounded-xl text-sm font-bold transition-all">
            <Settings size={18} /> Settings
          </button>
        </nav>

        <button 
          onClick={() => router.push("/login")}
          className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-50 rounded-xl text-sm font-bold transition-all mt-auto"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 flex flex-col">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-1">Your Research</h1>
            <p className="text-ivy-text/40 text-sm font-medium">Manage and collaborate on your academic papers.</p>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-ivy-text text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-ivy-text/90 transition-all shadow-lg text-sm"
          >
            <Plus size={18} /> New Project
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl border border-ivy-text/5 shadow-sm">
            <p className="text-ivy-text/40 text-xs font-bold uppercase tracking-wider mb-2">Total Papers</p>
            <p className="text-3xl font-serif font-bold">12</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-ivy-text/5 shadow-sm">
            <p className="text-ivy-text/40 text-xs font-bold uppercase tracking-wider mb-2">Citations Found</p>
            <p className="text-3xl font-serif font-bold text-ivy-accent">1,429</p>
          </div>
          <div className="bg-ivy-text p-6 rounded-2xl border border-ivy-text/5 shadow-lg relative overflow-hidden">
            <Sparkles className="absolute right-[-10px] top-[-10px] text-white/10 w-24 h-24" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">AI Suggestions</p>
            <p className="text-3xl font-serif font-bold text-white">42 Active</p>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">Recent Projects</h2>
            <div className="flex items-center gap-2 bg-white border border-ivy-text/5 px-3 py-1.5 rounded-lg">
              <Search size={14} className="text-ivy-text/30" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-transparent outline-none text-xs text-ivy-text placeholder:text-ivy-text/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-10 h-10 border-4 border-ivy-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-ivy-text/20 text-xs font-bold uppercase tracking-widest">Loading Repository</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Link 
                  key={project._id}
                  href={`/editor/${project._id}`}
                  className="bg-white p-5 rounded-2xl border border-ivy-text/5 hover:border-ivy-accent transition-all group flex items-center justify-between shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F2EA] rounded-xl flex items-center justify-center text-ivy-accent group-hover:bg-ivy-accent group-hover:text-white transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold tracking-tight text-sm mb-1">{project.title}</h3>
                      <p className="text-xs text-ivy-text/30 font-medium">Modified {new Date(project.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {project.collaborators.map((_, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-ivy-text/5 border-2 border-white flex items-center justify-center text-[10px] font-bold text-ivy-text/40">
                          U
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      className="p-2 hover:bg-ivy-text/5 rounded-lg text-ivy-text/20 hover:text-ivy-text transition-all"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}