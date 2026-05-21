export type FileType = "summary" | "code" | "anchor" | "note" | "prompt";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
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

  createProject(name: string): Project {
    const project: Project = { id: uid(), name, createdAt: Date.now() };
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
};
