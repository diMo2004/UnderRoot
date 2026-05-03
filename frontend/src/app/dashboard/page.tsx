"use client";
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Users, 
  Settings, 
  LogOut, 
  BookOpen, 
  MoreVertical,
  ScrollText,
  ChevronRight
} from 'lucide-react';
import { projectAPI } from '@/lib/api';

const theme = {
  bg: '#F5F0E8',
  text: '#1C3A2A',
  primary: '#0D2318',
  accent: '#B8962E',
  cardBg: '#FAF8F3',
  cardBorder: '#DDD5C0',
  muted: '#6B6450',
};

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.list();
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    const title = prompt("Enter manuscript title:", "Untitled Manuscript");
    if (!title) return;
    try {
      const res = await projectAPI.create({ title });
      window.location.href = `/scriptorium?id=${res.data._id}`;
    } catch (err) {
      alert("Failed to create project");
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this manuscript? This action cannot be undone.")) return;
    try {
      await projectAPI.delete(id);
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("Failed to delete project");
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ 
        background: theme.primary, color: '#FAF8F3', 
        padding: '0 40px', height: 64, 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(13,35,24,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            width: 36, height: 36, background: '#FAF8F3', color: theme.primary, 
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 18
          }}>U</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>UnderRoot</h1>
            <p style={{ margin: 0, fontSize: 9, textTransform: 'uppercase', color: theme.accent, letterSpacing: '0.12em' }}>Scholar Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button style={{ background: 'none', border: 'none', color: '#FAF8F3', cursor: 'pointer', opacity: 0.7 }}>
            <Settings size={18} />
          </button>
          <button onClick={() => window.location.href = '/'} style={{ background: 'none', border: 'none', color: '#FAF8F3', cursor: 'pointer', opacity: 0.7 }}>
            <LogOut size={18} />
          </button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
            JS
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>
        {/* Top Section */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px', fontFamily: "'Playfair Display', serif" }}>Your Library</h2>
            <p style={{ margin: 0, color: theme.muted, fontSize: 14 }}>Manage your research manuscripts and collaborative projects.</p>
          </div>
          <button onClick={createNewProject} style={{
            background: theme.primary, color: '#FAF8F3', border: 'none', borderRadius: 8,
            padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(13,35,24,0.2)'
          }}>
            <Plus size={18} /> New Manuscript
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} size={16} />
            <input 
              type="text" 
              placeholder="Search manuscripts..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 42px', borderRadius: 10,
                border: `1px solid ${theme.cardBorder}`, background: theme.cardBg,
                fontSize: 14, outline: 'none', color: theme.text
              }}
            />
          </div>
          <select style={{
            padding: '0 16px', borderRadius: 10, border: `1px solid ${theme.cardBorder}`,
            background: theme.cardBg, fontSize: 13, color: theme.muted, outline: 'none', cursor: 'pointer'
          }}>
            <option>All Projects</option>
            <option>Recent</option>
            <option>Shared with me</option>
          </select>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ 
              width: 40, height: 40, border: '3px solid #DDD5C0', borderTop: '3px solid #0D2318',
              borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px'
            }} />
            <p style={{ color: theme.muted, fontStyle: 'italic' }}>Consulting the archives...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '100px 0', border: `2px dashed ${theme.cardBorder}`,
            borderRadius: 20, background: 'rgba(250, 248, 243, 0.5)'
          }}>
            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ color: theme.muted, margin: 0 }}>No manuscripts found.</p>
            <button onClick={createNewProject} style={{ background: 'none', border: 'none', color: theme.accent, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              Start your first paper →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {filteredProjects.map((p) => (
              <div 
                key={p._id}
                onClick={() => window.location.href = `/scriptorium?id=${p._id}`}
                style={{
                  background: theme.cardBg, borderRadius: 16, border: `1px solid ${theme.cardBorder}`,
                  padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = theme.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = theme.cardBorder;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ 
                    width: 48, height: 48, background: 'rgba(13,35,24,0.05)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary
                  }}>
                    <ScrollText size={24} />
                  </div>
                  <button 
                    onClick={(e) => deleteProject(e, p._id)}
                    style={{ 
                      background: 'none', border: 'none', color: theme.muted, 
                      cursor: 'pointer', opacity: 0.4, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{p.title}</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.muted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.metadata?.abstract || "No abstract available for this manuscript."}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.muted }}>
                    <Clock size={14} /> {new Date(p.lastModified).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.muted }}>
                    <Users size={14} /> {p.collaborators?.length + 1 || 1}
                  </div>
                  <div style={{ flex: 1 }} />
                  <ChevronRight size={16} style={{ color: theme.accent }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@400;600;700&display=swap');
      `}</style>
    </div>
  );
}
