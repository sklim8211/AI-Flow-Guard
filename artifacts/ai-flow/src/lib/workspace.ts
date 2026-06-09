import type { WorkflowType } from "./prompts";

export type FileType = "summary" | "code" | "anchor" | "note" | "prompt";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  /** Optional workflow type — null/undefined means "not yet chosen" (uses common defaults). */
  workflow?: WorkflowType | null;
}

export interface WFolder {
  id: string;
  projectId: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface WFile {
  id: string;
  projectId: string;
  folderId: string;
  name: string;
  content: string;
  type: FileType;
  createdAt: number;
  updatedAt: number;
}

const KEYS = {
  projects: "qq_projects",
  folders: "qq_folders",
  files: "qq_files",
  activeProject: "qq_active_project",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_FOLDERS = [
  "CURRENT",
  "NEXT",
  "ANCHORS",
  "SUMMARIES",
  "DRAFTS",
  "PROMPTS",
  "CODE",
  "SAFE",
  "TEMP",
];

export const ws = {
  /* ── Projects ───────────────────────────────── */
  getProjects(): Project[] {
    return load<Project[]>(KEYS.projects, []);
  },

  getActiveProjectId(): string | null {
    return localStorage.getItem(KEYS.activeProject);
  },

  setActiveProject(id: string) {
    localStorage.setItem(KEYS.activeProject, id);
  },

  createProject(name: string, workflow: WorkflowType | null = null): Project {
    const project: Project = { id: uid(), name, createdAt: Date.now(), workflow };
    const projects = this.getProjects();
    save(KEYS.projects, [...projects, project]);

    const folders = this.getFolders();
    const newFolders: WFolder[] = DEFAULT_FOLDERS.map((n, i) => ({
      id: uid(),
      projectId: project.id,
      name: n,
      parentId: null,
      order: i,
    }));
    save(KEYS.folders, [...folders, ...newFolders]);

    this.setActiveProject(project.id);
    return project;
  },

  deleteProject(id: string) {
    save(
      KEYS.projects,
      this.getProjects().filter((p) => p.id !== id)
    );
    save(
      KEYS.folders,
      this.getFolders().filter((f) => f.projectId !== id)
    );
    save(
      KEYS.files,
      this.getFiles().filter((f) => f.projectId !== id)
    );
    if (this.getActiveProjectId() === id) {
      const remaining = this.getProjects();
      localStorage.setItem(KEYS.activeProject, remaining[0]?.id ?? "");
    }
  },

  renameProject(id: string, name: string) {
    save(
      KEYS.projects,
      this.getProjects().map((p) => (p.id === id ? { ...p, name } : p))
    );
  },

  setProjectWorkflow(id: string, workflow: WorkflowType | null) {
    save(
      KEYS.projects,
      this.getProjects().map((p) => (p.id === id ? { ...p, workflow } : p))
    );
  },

  /* ── Folders ────────────────────────────────── */
  getFolders(projectId?: string): WFolder[] {
    const all = load<WFolder[]>(KEYS.folders, []);
    return projectId ? all.filter((f) => f.projectId === projectId) : all;
  },

  createFolder(projectId: string, name: string, parentId: string | null): WFolder {
    const folders = this.getFolders();
    const siblings = folders.filter(
      (f) => f.projectId === projectId && f.parentId === parentId
    );
    const folder: WFolder = {
      id: uid(),
      projectId,
      name,
      parentId,
      order: siblings.length,
    };
    save(KEYS.folders, [...folders, folder]);
    return folder;
  },

  renameFolder(id: string, name: string) {
    save(
      KEYS.folders,
      this.getFolders().map((f) => (f.id === id ? { ...f, name } : f))
    );
  },

  deleteFolder(id: string) {
    const children = this.getFolders().filter((f) => f.parentId === id);
    children.forEach((c) => this.deleteFolder(c.id));
    save(
      KEYS.folders,
      this.getFolders().filter((f) => f.id !== id)
    );
    save(
      KEYS.files,
      this.getFiles().filter((f) => f.folderId !== id)
    );
  },

  /* ── Files ──────────────────────────────────── */
  getFiles(projectId?: string): WFile[] {
    const all = load<WFile[]>(KEYS.files, []);
    return projectId ? all.filter((f) => f.projectId === projectId) : all;
  },

  getFilesInFolder(folderId: string): WFile[] {
    return this.getFiles().filter((f) => f.folderId === folderId);
  },

  createFile(
    projectId: string,
    folderId: string,
    name: string,
    content: string,
    type: FileType
  ): WFile {
    const file: WFile = {
      id: uid(),
      projectId,
      folderId,
      name,
      content,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    save(KEYS.files, [...this.getFiles(), file]);
    return file;
  },

  updateFile(id: string, patch: Partial<Pick<WFile, "name" | "content">>) {
    save(
      KEYS.files,
      this.getFiles().map((f) =>
        f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f
      )
    );
  },

  deleteFile(id: string) {
    save(
      KEYS.files,
      this.getFiles().filter((f) => f.id !== id)
    );
  },

  /* ── Filesystem path helpers ────────────────── */
  getFolderPath(folderId: string): string[] {
    const folders = this.getFolders();
    const path: string[] = [];
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      path.unshift(current.name);
      current = current.parentId
        ? folders.find((f) => f.id === current!.parentId)
        : undefined;
    }
    return path;
  },

  getProjectName(projectId: string): string {
    return this.getProjects().find((p) => p.id === projectId)?.name ?? projectId;
  },

  /* ── Dashboard helpers ─────────────────────────── */
  getFilesToday(projectId: string): WFile[] {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    return this.getFiles(projectId)
      .filter((f) => f.createdAt >= startMs)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getFilesInFolderByName(projectId: string, folderName: string, limit?: number): WFile[] {
    const folder = this.getFolders(projectId).find(
      (f) => f.name.toUpperCase() === folderName.toUpperCase() && f.parentId === null
    );
    if (!folder) return [];
    const files = this.getFilesInFolder(folder.id).sort((a, b) => b.createdAt - a.createdAt);
    return limit ? files.slice(0, limit) : files;
  },

  getMostRecentFile(projectId: string): WFile | null {
    const all = this.getFiles(projectId).sort((a, b) => b.createdAt - a.createdAt);
    return all[0] ?? null;
  },

  /**
   * Ensure all DEFAULT_FOLDERS exist for every project.
   * Used to migrate existing projects when we add a new default folder.
   * Safe to call repeatedly — only adds missing folders.
   */
  ensureDefaultFoldersForAllProjects() {
    const allFolders = this.getFolders();
    const allProjects = this.getProjects();
    const toAdd: WFolder[] = [];
    for (const project of allProjects) {
      const existing = new Set(
        allFolders
          .filter((f) => f.projectId === project.id && f.parentId === null)
          .map((f) => f.name.toUpperCase())
      );
      const maxOrder = allFolders
        .filter((f) => f.projectId === project.id && f.parentId === null)
        .reduce((m, f) => Math.max(m, f.order), -1);
      let nextOrder = maxOrder + 1;
      for (const name of DEFAULT_FOLDERS) {
        if (!existing.has(name.toUpperCase())) {
          toAdd.push({
            id: uid(),
            projectId: project.id,
            name,
            parentId: null,
            order: nextOrder++,
          });
        }
      }
    }
    if (toAdd.length > 0) {
      save(KEYS.folders, [...allFolders, ...toAdd]);
    }
    return toAdd.length;
  },
};

/* ── Metadata parsing (shared) ──────────────────────── */
export interface FileMeta {
  kind?: string;
  summary?: string;
  workflow?: string;
}

export function parseFileMeta(raw: string): FileMeta {
  if (!raw) return {};
  // Normalize CRLF/CR → LF first. Pasted AI text often has \r\n line endings,
  // which break the per-line regex (`.` won't match \r, `$` only stops at LF/end).
  let body = raw.replace(/\r\n?/g, "\n").trim();
  const fenceMatch = body.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) body = fenceMatch[1];
  const result: FileMeta = {};
  const yamlMatch = body.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const lines = yamlMatch[1].split("\n");
    for (const line of lines) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
      if (!m) continue;
      const key = m[1];
      // Strip surrounding quotes — AI often emits YAML values like kind: "anchors".
      const value = m[2].trim().replace(/^["']|["']$/g, "").trim();
      if (key === "kind") result.kind = value.toLowerCase();
      else if (key === "summary") result.summary = value;
      else if (key === "workflow") result.workflow = value.toLowerCase();
    }
  }
  return result;
}
