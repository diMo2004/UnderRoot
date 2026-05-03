import axios from "axios";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: { cached?: boolean };
};

export type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000",
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
  login: (credential: string) =>
    api.post("/api/auth/google", { credential }),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get("/api/auth/me"),
};

export const projectAPI = {
  list: () => api.get("/api/projects"),
  get: (id: string) => api.get(`/api/projects/${id}`),
  create: (data: { title: string }) => api.post("/api/projects", data),
  update: (id: string, data: { title: string }) =>
    api.put(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
  addCollaborator: (id: string, email: string, role: string) =>
    api.post(`/api/projects/${id}/collaborators`, { email, role }),
  addCitation: (id: string, citation: any, format: string) =>
    api.post(`/api/citations/add`, { projectId: id, source: citation, template: format }),
  getBibliography: (id: string, format: string) =>
    api.get(`/api/citations/project/${id}?template=${format}`),
};

export const citationAPI = {
  suggest: (text: string, projectId?: string) =>
    api.post<ApiResponse<{ citations?: unknown[] }>>("/api/citations/suggest", { text, projectId }),
};

export const plagiarismAPI = {
  check: (text: string, projectId?: string) =>
    api.post<ApiResponse<unknown>>("/api/plagiarism/check", { text, projectId }),
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