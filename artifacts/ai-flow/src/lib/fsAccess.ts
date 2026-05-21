const DB_NAME = "qq_sidecar_fs";
const DB_VERSION = 1;
const STORE = "handles";
const ROOT_KEY = "rootHandle";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export const fsAccess = {
  isSupported(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  },

  async pickRootFolder(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });
      await dbSet(ROOT_KEY, handle);
      return handle;
    } catch {
      return null;
    }
  },

  async getRootHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;
    try {
      const handle = await dbGet<FileSystemDirectoryHandle>(ROOT_KEY);
      if (!handle) return null;
      const permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission === "granted") return handle;
      return null;
    } catch {
      return null;
    }
  },

  async clearRoot(): Promise<void> {
    await dbDelete(ROOT_KEY);
  },

  async hasRoot(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const handle = await dbGet<FileSystemDirectoryHandle>(ROOT_KEY);
    return !!handle;
  },

  async getRootName(): Promise<string | null> {
    const handle = await dbGet<FileSystemDirectoryHandle>(ROOT_KEY);
    return handle?.name ?? null;
  },

  async createProjectFolders(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    folders: string[]
  ): Promise<void> {
    const projectDir = await rootHandle.getDirectoryHandle(projectName, {
      create: true,
    });
    for (const folder of folders) {
      await projectDir.getDirectoryHandle(folder, { create: true });
    }
  },

  async writeFile(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    folderPath: string[],
    fileName: string,
    content: string
  ): Promise<void> {
    let dir = await rootHandle.getDirectoryHandle(projectName, { create: true });
    for (const segment of folderPath) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    const safeName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const fileHandle = await dir.getFileHandle(safeName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  },

  async deleteFile(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    folderPath: string[],
    fileName: string
  ): Promise<void> {
    try {
      let dir = await rootHandle.getDirectoryHandle(projectName, { create: false });
      for (const segment of folderPath) {
        dir = await dir.getDirectoryHandle(segment, { create: false });
      }
      const safeName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
      await dir.removeEntry(safeName);
    } catch {
      // file may already be gone
    }
  },

  async createSubfolder(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    folderPath: string[],
    subfolderName: string
  ): Promise<void> {
    let dir = await rootHandle.getDirectoryHandle(projectName, { create: true });
    for (const segment of folderPath) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    await dir.getDirectoryHandle(subfolderName, { create: true });
  },
};
