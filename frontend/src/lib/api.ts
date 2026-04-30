import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("underroot_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authAPI = {
  login: (credential: string) => api.post("/api/auth/google", { credential }),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get("/api/auth/me"),
};

export const projectAPI = {
  list: () => api.get("/api/projects"),
  get: (id: string) => api.get(`/api/projects/${id}`),
  create: (data: { title: string }) => api.post("/api/projects", data),
  update: (id: string, data: { title: string }) => api.put(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
  addCollaborator: (id: string, email: string, role: string) =>
    api.post(`/api/projects/${id}/collaborators`, { email, role }),
};

export const citationAPI = {
  suggest: (text: string, projectId?: string) =>
    api.post("/api/citations/suggest", { text, projectId }),

  // NEW: format a selected source into a citation string
  // Backend endpoint you should add: POST /api/citations/format
  format: (payload: {
    style: "ieee" | "apa" | "acm";
    source: { title?: string; url?: string; doi?: string; year?: number; provider?: string };
    index?: number;
  }) => api.post("/api/citations/format", { index: 1, ...payload }),
};

export const plagiarismAPI = {
  check: (text: string, projectId?: string) =>
    api.post("/api/plagiarism/check", { text, projectId }),
};

export const summaryAPI = {
  generate: (text: string, projectId?: string) =>
    api.post("/api/summary/generate", { text, projectId }),
};

export const exportAPI = {
  pdf: (projectId: string) =>
    api.get(`/api/export/${projectId}/pdf`, { responseType: "blob" }),
  docx: (projectId: string) =>
    api.get(`/api/export/${projectId}/docx`, { responseType: "blob" }),
  latex: (projectId: string) =>
    api.get(`/api/export/${projectId}/latex`, { responseType: "blob" }),
};

export default api;