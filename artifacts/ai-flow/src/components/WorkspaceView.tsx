import { useState, useCallback } from "react";
import {
  FolderOpen,
  Folder,
  File,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { ws, type WFolder, type WFile, type Project } from "../lib/workspace";

const FOLDER_COLORS: Record<string, string> = {
  CURRENT: "#10b981",
  NEXT: "#3b82f6",
  ANCHORS: "#8b5cf6",
  SUMMARIES: "#f59e0b",
  PROMPTS: "#06b6d4",
  CODE: "#6366f1",
  SAFE: "#84cc16",
  TEMP: "#94a3b8",
};

interface Props {
  projectId: string;
  onOpenFile: (file: WFile) => void;
  onNewFile: (folderId: string, folderName: string) => void;
  refresh: number;
  onRefresh: () => void;
}

function FolderRow({
  folder,
  files,
  subfolders,
  depth,
  onOpenFile,
  onNewFile,
  onRefresh,
}: {
  folder: WFolder;
  files: WFile[];
  subfolders: WFolder[];
  allFolders: WFolder[];
  allFiles: WFile[];
  depth: number;
  onOpenFile: (f: WFile) => void;
  onNewFile: (folderId: string, folderName: string) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(depth === 0 && files.length > 0);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(folder.name);

  const color = FOLDER_COLORS[folder.name] ?? "#64748b";
  const indent = depth * 12;

  const handleRename = () => {
    if (renameVal.trim()) {
      ws.renameFolder(folder.id, renameVal.trim());
      onRefresh();
    }
    setRenaming(false);
  };

  const handleDeleteFolder = () => {
    if (confirm(`"${folder.name}" 폴더와 모든 파일을 삭제할까요?`)) {
      ws.deleteFolder(folder.id);
      onRefresh();
    }
  };

  const handleAddSubfolder = () => {
    const name = prompt("새 폴더 이름:");
    if (name?.trim()) {
      ws.createFolder(folder.projectId, name.trim(), folder.id);
      onRefresh();
      setOpen(true);
    }
  };

  return (
    <div>
      {/* Folder header */}
      <div
        className="group flex items-center gap-1 py-1.5 pr-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
        style={{ paddingLeft: 8 + indent }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-slate-400 flex-shrink-0">
          {open ? (
            <ChevronDown style={{ width: 12, height: 12 }} />
          ) : (
            <ChevronRight style={{ width: 12, height: 12 }} />
          )}
        </span>
        {open ? (
          <FolderOpen style={{ width: 13, height: 13, color, flexShrink: 0 }} />
        ) : (
          <Folder style={{ width: 13, height: 13, color, flexShrink: 0 }} />
        )}
        {renaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs bg-white border border-slate-300 rounded px-1 py-0.5 focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-xs font-semibold text-slate-600 truncate">
            {folder.name}
          </span>
        )}
        {files.length > 0 && (
          <span
            className="text-[9px] font-bold px-1 rounded"
            style={{ background: color + "1a", color }}
          >
            {files.length}
          </span>
        )}
        {/* Row actions */}
        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewFile(folder.id, folder.name);
            }}
            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            title="파일 추가"
          >
            <FilePlus style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddSubfolder();
            }}
            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            title="하위 폴더 추가"
          >
            <FolderPlus style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
              setRenameVal(folder.name);
            }}
            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            title="이름 변경"
          >
            <Edit3 style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteFolder();
            }}
            className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
            title="폴더 삭제"
          >
            <Trash2 style={{ width: 11, height: 11 }} />
          </button>
        </span>
      </div>

      {/* Files */}
      {open && (
        <div>
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              depth={depth + 1}
              onOpen={onOpenFile}
              onRefresh={onRefresh}
            />
          ))}
          {subfolders.map((sub) => (
            <FolderRow
              key={sub.id}
              folder={sub}
              files={ws.getFilesInFolder(sub.id)}
              subfolders={ws
                .getFolders(sub.projectId)
                .filter((f) => f.parentId === sub.id)}
              allFolders={[]}
              allFiles={[]}
              depth={depth + 1}
              onOpenFile={onOpenFile}
              onNewFile={onNewFile}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  depth,
  onOpen,
  onRefresh,
}: {
  file: WFile;
  depth: number;
  onOpen: (f: WFile) => void;
  onRefresh: () => void;
}) {
  const indent = depth * 12;
  const typeColor: Record<string, string> = {
    summary: "#f59e0b",
    code: "#6366f1",
    anchor: "#8b5cf6",
    note: "#64748b",
    prompt: "#06b6d4",
  };
  const color = typeColor[file.type] ?? "#64748b";

  return (
    <div
      className="group flex items-center gap-1.5 py-1 pr-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
      style={{ paddingLeft: 8 + indent }}
      onClick={() => onOpen(file)}
    >
      <File style={{ width: 11, height: 11, color, flexShrink: 0 }} />
      <span className="flex-1 text-[11px] text-slate-600 truncate">
        {file.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`"${file.name}" 파일을 삭제할까요?`)) {
            ws.deleteFile(file.id);
            onRefresh();
          }
        }}
        className="p-0.5 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        title="삭제"
      >
        <Trash2 style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
}

export function WorkspaceView({ projectId, onOpenFile, onNewFile, refresh, onRefresh }: Props) {
  const folders = ws
    .getFolders(projectId)
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  const allFolders = ws.getFolders(projectId);

  const handleAddTopFolder = () => {
    const name = prompt("새 폴더 이름:");
    if (name?.trim()) {
      ws.createFolder(projectId, name.trim(), null);
      onRefresh();
    }
  };

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <p className="text-[11px] text-slate-400">폴더가 없습니다</p>
        <button
          onClick={handleAddTopFolder}
          className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus style={{ width: 12, height: 12 }} />
          폴더 추가
        </button>
      </div>
    );
  }

  return (
    <div key={refresh} className="px-2 py-1 space-y-0.5">
      {folders.map((folder) => {
        const files = ws.getFilesInFolder(folder.id);
        const subs = allFolders.filter((f) => f.parentId === folder.id);
        return (
          <FolderRow
            key={folder.id}
            folder={folder}
            files={files}
            subfolders={subs}
            allFolders={allFolders}
            allFiles={ws.getFiles(projectId)}
            depth={0}
            onOpenFile={onOpenFile}
            onNewFile={onNewFile}
            onRefresh={onRefresh}
          />
        );
      })}
      <button
        onClick={handleAddTopFolder}
        className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors w-full"
      >
        <FolderPlus style={{ width: 12, height: 12 }} />
        폴더 추가
      </button>
    </div>
  );
}
