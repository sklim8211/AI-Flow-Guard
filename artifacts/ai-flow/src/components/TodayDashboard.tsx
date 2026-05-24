import { useEffect, useMemo, useState } from "react";
import { Sunrise, Moon, ArrowRight, FileText, Anchor as AnchorIcon, ListChecks, Sparkles } from "lucide-react";
import { ws, parseFileMeta, type WFile } from "../lib/workspace";
import { getTodayLabels, type WorkflowType } from "../lib/prompts";

interface Props {
  projectId: string | null;
  workflow: WorkflowType | null;
  refreshKey: number;
  onOpenFile: (file: WFile) => void;
  onGoToPrompts: () => void;
  onGoToWorkspace?: () => void;
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function fmtRelative(ts: number) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString();
}

export function TodayDashboard({ projectId, workflow, refreshKey, onOpenFile, onGoToPrompts, onGoToWorkspace }: Props) {
  const [mode, setMode] = useState<"start" | "end">("start");
  const labels = getTodayLabels(workflow);

  // Tick every minute so relative timestamps and "today" boundary refresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    if (!projectId) return null;
    const activeWf: WorkflowType = workflow ?? "development";

    /**
     * Parse each file's metadata at most once per render, keyed by file id +
     * updatedAt. parseFileMeta scans the file body, so re-parsing the same
     * file across every list (today / current / next / anchors / mostRecent)
     * gets expensive once a project accumulates a lot of files.
     */
    const metaCache = new Map<string, ReturnType<typeof parseFileMeta>>();
    const getMeta = (file: WFile) => {
      const key = `${file.id}:${file.updatedAt}`;
      let m = metaCache.get(key);
      if (!m) {
        m = parseFileMeta(file.content);
        metaCache.set(key, m);
      }
      return m;
    };

    /**
     * A file belongs in "오늘" only if its workflow stamp matches the active
     * workflow, or if it's a common safety doc (compress/backup/restore), or
     * if it has no workflow field at all (legacy files from before the
     * workflow concept existed). This keeps the dashboard honest about what
     * mode a file was actually created under.
     */
    const matchesWorkflow = (file: WFile): boolean => {
      const meta = getMeta(file);
      if (!meta.workflow) return true;
      if (meta.workflow === "common") return true;
      return meta.workflow === activeWf;
    };

    // mostRecent: search the full project (already sorted desc by getFiles)
    // for the most recent file that matches. No artificial limit — without
    // this, a busy project could push the matching file out of view.
    const allFilesDesc = ws.getFiles(projectId).sort((a, b) => b.createdAt - a.createdAt);
    const mostRecent = allFilesDesc.find(matchesWorkflow) ?? null;

    const current = ws.getFilesInFolderByName(projectId, "CURRENT").filter(matchesWorkflow).slice(0, 3);
    const next = ws.getFilesInFolderByName(projectId, "NEXT").filter(matchesWorkflow).slice(0, 3);
    const anchors = ws.getFilesInFolderByName(projectId, "ANCHORS").filter(matchesWorkflow).slice(0, 5);
    const todayAll = ws.getFilesToday(projectId);
    const today = todayAll.filter(matchesWorkflow);
    const hiddenTodayCount = todayAll.length - today.length;
    const todayAnchors = today.filter((f) => f.type === "anchor");
    const todayNext = today.filter((f) => getMeta(f).kind === "next");
    return {
      mostRecent,
      current,
      next,
      anchors,
      today,
      todayAnchors,
      todayNext,
      hiddenTodayCount,
      getMeta,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, workflow, refreshKey, tick]);

  if (!projectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <Sparkles style={{ width: 32, height: 32, color: "#cbd5e1" }} className="mb-3" />
        <p className="text-sm font-semibold text-slate-600 mb-1">프로젝트가 없어요</p>
        <p className="text-xs text-slate-400 mb-4">Workspace 탭에서 프로젝트를 만들면<br/>여기에 작업 흐름이 보입니다.</p>
      </div>
    );
  }

  if (!data) return null;

  /* ── Start mode ──────────────────────────────────── */
  if (mode === "start") {
    const fileRow = (file: WFile) => {
      const meta = data.getMeta(file);
      const isCommon = meta.workflow === "common";
      return (
        <button
          key={file.id}
          onClick={() => onOpenFile(file)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
              {isCommon && (
                <span title="공통 안전 도구로 만든 파일" style={{ fontSize: 10 }}>🛟</span>
              )}
              {file.name.replace(/\.md$/, "")}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{fmtRelative(file.createdAt)}</span>
          </div>
          {meta.summary && (
            <p className="text-[11px] text-slate-500 line-clamp-2">{meta.summary}</p>
          )}
        </button>
      );
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {data.hiddenTodayCount > 0 && (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
              title="다른 모드에서 만든 파일은 그 모드로 전환해야 보입니다."
            >
              <span className="text-[11px] text-slate-600">
                다른 모드 파일 <b>{data.hiddenTodayCount}개</b> 숨김
              </span>
              {onGoToWorkspace && (
                <button
                  onClick={onGoToWorkspace}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  Workspace에서 보기 <ArrowRight style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
          )}

          {/* 이어가기 — most recent */}
          {data.mostRecent ? (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Sunrise style={{ width: 14, height: 14, color: "#f59e0b" }} />
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">{labels.resume}</h3>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {data.getMeta(data.mostRecent).workflow === "common" && (
                      <span title="공통 안전 도구로 만든 파일" style={{ fontSize: 10 }}>🛟</span>
                    )}
                    {data.mostRecent.name.replace(/\.md$/, "")}
                  </span>
                  <span className="text-[10px] text-amber-700 shrink-0">{fmtRelative(data.mostRecent.createdAt)}</span>
                </div>
                {(() => {
                  const meta = data.getMeta(data.mostRecent);
                  return meta.summary ? (
                    <p className="text-[11px] text-slate-600 mb-2">{meta.summary}</p>
                  ) : null;
                })()}
                <button
                  onClick={() => onOpenFile(data.mostRecent!)}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  {labels.resumeOpen} <ArrowRight style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Sunrise style={{ width: 14, height: 14, color: "#f59e0b" }} />
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">{labels.resume}</h3>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-2">아직 저장한 작업이 없어요.</p>
                <button
                  onClick={onGoToPrompts}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  프롬프트 보러가기 <ArrowRight style={{ width: 11, height: 11 }} />
                </button>
              </div>
            </section>
          )}

          {/* 현재 */}
          {data.current.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <FileText style={{ width: 14, height: 14, color: "#3b82f6" }} />
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  {labels.current} ({data.current.length})
                </h3>
              </div>
              <div className="space-y-1">{data.current.map(fileRow)}</div>
            </section>
          )}

          {/* 다음 */}
          {data.next.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks style={{ width: 14, height: 14, color: "#ef4444" }} />
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  {labels.next} ({data.next.length})
                </h3>
              </div>
              <div className="space-y-1">{data.next.map(fileRow)}</div>
            </section>
          )}

          {/* 핵심 결정 */}
          {data.anchors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AnchorIcon style={{ width: 14, height: 14, color: "#8b5cf6" }} />
                <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                  {labels.anchors} ({data.anchors.length})
                </h3>
              </div>
              <div className="space-y-1">{data.anchors.map(fileRow)}</div>
            </section>
          )}
        </div>

        {/* End-of-day button */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <button
            onClick={() => setMode("end")}
            className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "#0f172a", color: "#fff" }}
          >
            <Moon style={{ width: 14, height: 14 }} />
            {labels.endDay}
          </button>
        </div>
      </div>
    );
  }

  /* ── End mode ────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {data.hiddenTodayCount > 0 && (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
            title="다른 모드에서 만든 파일은 그 모드로 전환해야 보입니다."
          >
            <span className="text-[11px] text-slate-600">
              다른 모드 파일 <b>{data.hiddenTodayCount}개</b> 숨김
            </span>
            {onGoToWorkspace && (
              <button
                onClick={onGoToWorkspace}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
              >
                Workspace에서 보기 <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>
        )}

        <div className="text-center py-2">
          <Moon style={{ width: 28, height: 28, color: "#6366f1" }} className="mx-auto mb-2" />
          <h2 className="text-sm font-bold text-slate-800">{labels.endTitle}</h2>
          <p className="text-[11px] text-slate-500 mt-1">수고하셨어요.</p>
        </div>

        {/* 오늘 저장 */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <FileText style={{ width: 14, height: 14, color: "#3b82f6" }} />
            <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
              {labels.todaySaved} ({data.today.length})
            </h3>
          </div>
          {data.today.length > 0 ? (
            <div className="space-y-1">
              {data.today.map((file) => {
                const meta = data.getMeta(file);
                return (
                  <button
                    key={file.id}
                    onClick={() => onOpenFile(file)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
                        {meta.workflow === "common" && (
                          <span title="공통 안전 도구로 만든 파일" style={{ fontSize: 10 }}>🛟</span>
                        )}
                        {file.name.replace(/\.md$/, "")}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{fmtTime(file.createdAt)}</span>
                    </div>
                    {meta.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{meta.summary}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 px-3 py-2">{labels.todaySavedEmpty}</p>
          )}
        </section>

        {/* 오늘의 핵심 결정 */}
        {data.todayAnchors.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AnchorIcon style={{ width: 14, height: 14, color: "#8b5cf6" }} />
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                {labels.todayAnchors} ({data.todayAnchors.length})
              </h3>
            </div>
            <div className="space-y-1">
              {data.todayAnchors.map((file) => {
                const meta = data.getMeta(file);
                return (
                  <button
                    key={file.id}
                    onClick={() => onOpenFile(file)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
                      {meta.workflow === "common" && (
                        <span title="공통 안전 도구로 만든 파일" style={{ fontSize: 10 }}>🛟</span>
                      )}
                      {file.name.replace(/\.md$/, "")}
                    </span>
                    {meta.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{meta.summary}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 내일 이어갈 것 */}
        {data.todayNext.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight style={{ width: 14, height: 14, color: "#ef4444" }} />
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                {labels.tomorrow} ({data.todayNext.length})
              </h3>
            </div>
            <div className="space-y-1">
              {data.todayNext.map((file) => {
                const meta = data.getMeta(file);
                return (
                  <button
                    key={file.id}
                    onClick={() => onOpenFile(file)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
                      {meta.workflow === "common" && (
                        <span title="공통 안전 도구로 만든 파일" style={{ fontSize: 10 }}>🛟</span>
                      )}
                      {file.name.replace(/\.md$/, "")}
                    </span>
                    {meta.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{meta.summary}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Back to start */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <button
          onClick={() => setMode("start")}
          className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-slate-100"
          style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }}
        >
          <Sunrise style={{ width: 14, height: 14 }} />
          {labels.backToStart}
        </button>
      </div>
    </div>
  );
}
