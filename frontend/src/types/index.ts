export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color?: string;
}

export interface Project {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  collaborators: Collaborator[];
}

export interface Collaborator {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

export interface CitationResult {
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  citationCount: number;
  relevanceScore: number;
  doi?: string;
  url?: string;
  abstract?: string;
}

export interface CitationRequest {
  text: string;
  projectId?: string;
}

export interface PlagiarismMatch {
  matchedText: string;
  source: string;
  similarity: number;
  startIndex: number;
  endIndex: number;
}

export interface SectionPlagiarism {
  sectionTitle: string;
  overallScore: number;
  severity: "low" | "moderate" | "high" | "critical";
  matches: PlagiarismMatch[];
}

export interface PlagiarismResult {
  overallScore: number;
  severity: "low" | "moderate" | "high" | "critical";
  sections: SectionPlagiarism[];
  checkedAt: string;
}

export interface SummaryResult {
  sectionSummaries: { title: string; summary: string }[];
  abstractDraft: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}
