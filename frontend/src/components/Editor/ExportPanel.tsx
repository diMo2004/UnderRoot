"use client";

import { useState } from "react";
import { exportAPI } from "@/lib/api";
import { FileDown, FileText, FileCode, CheckCircle2 } from "lucide-react";

interface ExportPanelProps {
  title: string;
  content: string;
  projectId: string;
}

export default function ExportPanel({ title, content, projectId }: ExportPanelProps) {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"pdf" | "docx" | "latex">("pdf");
  const [style, setStyle] = useState<"IEEE" | "APA" | "ACM">("IEEE");
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const response = await exportAPI.generate({
        title,
        content,
        format,
        style,
        projectId
      });

      // Handle binary download
      const blob = new Blob([response.data], { 
        type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${title}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif font-bold text-ivy-text">Export Document</h2>
        <div className="p-2 bg-ivy-accent/10 rounded-lg text-ivy-accent">
          <FileDown size={20} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ivy-text/40 mb-2">Export Format</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "pdf", label: "PDF", icon: FileText },
              { id: "docx", label: "Word", icon: FileText },
              { id: "latex", label: "LaTeX", icon: FileCode },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  format === f.id
                    ? "border-ivy-accent bg-ivy-accent/5 text-ivy-accent"
                    : "border-ivy-text/5 hover:border-ivy-text/20 text-ivy-text/40"
                }`}
              >
                <f.icon size={20} className="mb-1" />
                <span className="text-[10px] font-bold">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-ivy-text/40 mb-2">Citation Style</label>
          <select 
            value={style}
            onChange={(e) => setStyle(e.target.value as any)}
            className="w-full bg-[#F5F2EA] border-none rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-ivy-accent"
          >
            <option value="IEEE">IEEE (Technical/Engineering)</option>
            <option value="APA">APA (Social Sciences)</option>
            <option value="ACM">ACM (Computing)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="mt-4 flex items-center justify-center gap-2 bg-ivy-text text-white rounded-xl py-4 text-sm font-bold hover:bg-ivy-text/90 transition-all shadow-lg disabled:opacity-50"
      >
        {success ? (
          <>
            <CheckCircle2 size={18} />
            Export Complete
          </>
        ) : (
          <>
            <FileDown size={18} />
            {loading ? "Preparing Document..." : `Download .${format.toUpperCase()}`}
          </>
        )}
      </button>

      <p className="text-[10px] text-center text-ivy-text/30 italic">
        Institutional headers and formatting will be applied automatically.
      </p>
    </div>
  );
}
