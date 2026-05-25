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
  Layers,
  X,
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
  /** Called with selected files when user clicks "Consolidate". */
  onConsolidate?: (files: WFile[]) => void;
}

function FolderRow({
  folder,
  files,
  subfolders,
  depth,
  onOpenFile,
  onNewFile,
  onRefresh,
  selectMode,
  isSelected,
  toggleSelect,
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
  selectMode: boolean;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
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
              selectMode={selectMode}
              selected={isSelected(file.id)}
              onToggleSelect={() => toggleSelect(file.id)}
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
              selectMode={selectMode}
              isSelected={isSelected}
              toggleSelect={toggleSelect}
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
  selectMode,
  selected,
  onToggleSelect,
}: {
  file: WFile;
  depth: number;
  onOpen: (f: WFile) => void;
  onRefresh: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
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

  const handleClick = () => {
    if (selectMode) onToggleSelect();
    else onOpen(file);
  };

  return (
    <div
      className="group flex items-center gap-1.5 py-1 pr-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors"
      style={{
        paddingLeft: 8 + indent,
        background: selectMode && selected ? "#eff6ff" : undefined,
      }}
      onClick={handleClick}
    >
      {selectMode ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer flex-shrink-0"
          style={{ width: 11, height: 11 }}
        />
      ) : (
        <File style={{ width: 11, height: 11, color, flexShrink: 0 }} />
      )}
      <span className="flex-1 text-[11px] text-slate-600 truncate">
        {file.name}
      </span>
      {!selectMode && (
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
      )}
    </div>
  );
}

export function WorkspaceView({ projectId, onOpenFile, onNewFile, refresh, onRefresh, onConsolidate }: Props) {
  const folders = ws
    .getFolders(projectId)
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  const allFolders = ws.getFolders(projectId);
  const allFiles = ws.getFiles(projectId);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleConsolidate = () => {
    const picked = allFiles.filter((f) => selectedIds.has(f.id));
    if (picked.length < 2 || !onConsolidate) return;
    // Pass in chronological order (oldest first) so the AI treats later ones as authoritative.
    picked.sort((a, b) => a.createdAt - b.createdAt);
    onConsolidate(picked);
    exitSelectMode();
  };

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

  const selectedCount = selectedIds.size;

  return (
    <div key={refresh} className="space-y-0.5">
      {/* Select-mode toolbar — Consolidate entry point */}
      {onConsolidate && (
        <div className="px-2 pb-1.5">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              disabled={allFiles.length < 2}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: allFiles.length >= 2 ? "#eff6ff" : "#f8fafc",
                color: allFiles.length >= 2 ? "#2563eb" : "#cbd5e1",
                border: allFiles.length >= 2 ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                cursor: allFiles.length >= 2 ? "pointer" : "not-allowed",
              }}
              title={
                allFiles.length >= 2
                  ? "여러 파일을 묶어서 AI에게 합치도록 요청"
                  : "파일이 2개 이상일 때 활성화됩니다"
              }
            >
              <Layers style={{ width: 12, height: 12 }} />
              {allFiles.length >= 2
                ? "🗂 여러 파일 합치기"
                : "🗂 여러 파일 합치기 (파일 2개 이상 필요)"}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <span className="text-[11px] font-semibold" style={{ color: "#1e40af" }}>
                합칠 파일을 골라주세요 · {selectedCount}개 선택됨
              </span>
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded transition-colors"
              >
                <X style={{ width: 11, height: 11 }} />
                취소
              </button>
            </div>
          )}
        </div>
      )}

      <div className="px-2 space-y-0.5">
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
              allFiles={allFiles}
              depth={0}
              onOpenFile={onOpenFile}
              onNewFile={onNewFile}
              onRefresh={onRefresh}
              selectMode={selectMode}
              isSelected={isSelected}
              toggleSelect={toggleSelect}
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

      {/* Consolidate action bar */}
      {selectMode && (
        <div
          className="sticky bottom-0 px-2 py-2"
          style={{
            background: "linear-gradient(to top, #ffffff 70%, rgba(255,255,255,0))",
          }}
        >
          <button
            onClick={handleConsolidate}
            disabled={selectedCount < 2}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: selectedCount >= 2 ? "#0f172a" : "#f1f5f9",
              color: selectedCount >= 2 ? "#fff" : "#94a3b8",
            }}
          >
            <Layers style={{ width: 12, height: 12 }} />
            {selectedCount < 2
              ? "2개 이상 선택하세요"
              : `${selectedCount}개 합치기 → AI 프롬프트 만들기`}
          </button>
        </div>
      )}
    </div>
  );
}
