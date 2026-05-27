# Quiet Question Sidecar (QQ Sidecar)

AI(ChatGPT/Claude)로 작업하는 비전문가가 **컨텍스트를 잃지 않도록** 도와주는 떠 있는 사이드카 유틸리티. AI에 연결되지 않은 "안전망"이다.

## 서비스 발전 방향 (미션)

> **AI 는 한 번에 잘 만들지만 간직하지 못한다. 우리는 AI 출력물을 파일로 간직하고, 다시 꺼내고, 다시 가공할 수 있는 모든 동사를 제공한다.**

우리는 AI 의 추론 능력과 경쟁하지 않는다. AI 가 구조적으로 못 하는 것 — 세션 너머의 기억, 시간 인식, 파일 단위의 조직 — 만 한다. **파일이 우리의 무기.**

AI 가 만든 결과물 = 원료. 우리 도구 = 가공 동사들. 모든 신규 기능은 "AI 출력물을 파일로 어떻게 다룰까" 의 한 가지 동사여야 한다. 현재 동사 목록:

- 저장 = `📋 클립보드에서 저장` (원료 입수)
- 묶기 = `Consolidate`, `Compress`, `Summary`
- 떼어내기 = (비어있음 — 미래 빈자리)
- 핵심 추출 = `Anchors`
- 다시 꺼내기 = `Resume`, `Restore`
- 다음 행동 변환 = `Next`
- 안전망 = `Backup`

새 기능 검토 시 이 동사 목록에 들어맞는지 먼저 확인한다. 안 맞으면 우리 미션 밖이다.

## 핵심 제품 모델 — 반드시 먼저 읽을 것

이 제품은 **AI 클라이언트가 아니다.** 우리는 ChatGPT/Claude에 직접 연결하지 않고, AI 응답을 자동으로 받지 않는다. 대신 다음 구조로 작동한다:

```
[우리 앱] ──표준 프롬프트──> 사용자가 카피
                                    ↓
                                AI에 붙여넣기
                                    ↓
                      AI가 메타데이터 포함된 결과 생성
                                    ↓
        사용자가 결과 카피 ──> [우리 앱이 폴더에 저장]
```

즉 우리는 두 가지만 한다:
1. **표준 프롬프트 카탈로그** — 각 아이콘/버튼은 검증된 프롬프트를 카피해준다
2. **AI 결과물 보관함** — 사용자가 받아온 응답을 적절한 폴더에 저장한다

"지능"은 전부 AI에 떠넘긴다. 우리는 AI를 부르지도, 보지도 않지만, **표준 프롬프트가 AI를 우리가 원하는 형태로 일하게 만든다.**

### 메타데이터 패턴 (앞으로 모든 새 표준 프롬프트의 필수 요구사항)

각 표준 프롬프트는 AI에게 **결과물 첫머리에 메타데이터 헤더를 포함**하도록 요청해야 한다. 현재 적용 상태:
- ✅ `Backup Snapshot` (version/created_at/summary/changes_from_previous/restoration_hint/risk_level)
- ✅ `Resume / Summary / Anchors / Compress / Next` — 공통 스키마 (version/created_at/kind/summary/keywords) + 결과물 마지막 줄에 `filename: <kind>_<slug>.md` 자동 제안

예시:

```
---
version: v3
created_at: 2026-05-21 15:30
summary: 라우터 모듈 리팩터링 직전 백업
changes_from_previous: ...
restoration_hint: ...
risk_level: high
---
```

이 패턴 덕분에 우리가 받은 텍스트 파일 안에 **AI가 직접 생성한 관리 정보**가 들어있고, 우리는 단순 저장만 해도 마치 AI가 파일 관리자처럼 작동하는 효과를 낸다.

### 명시적 비목표 (Non-goals)

- ❌ AI API 직접 호출
- ❌ AI 응답 자동 캡처/감시
- ❌ ChatGPT/Claude 대화 모니터링
- ❌ 모델 추천, 비교, 라우팅
- ❌ 결제, 사용자 계정, 클라우드 동기화

UI 어디서든 위와 같은 것을 암시해선 안 된다. "AI 응답은 자동 저장되지 않습니다. 본인이 받아온 내용만 저장됩니다." 를 사용자에게 정직하게 알린다.

### 확장 규칙 — 새 기능 추가 시 체크리스트

새 아이콘/기능을 추가할 때 항상 다음 4단계를 거친다:

1. **표준 프롬프트 작성** — AI에게 정확히 무엇을, 어떤 형식으로 요청할지
2. **메타데이터 헤더 정의** — 결과물에 어떤 관리 정보를 같이 받을지
3. **저장 폴더 결정** — 결과를 어느 폴더(CURRENT/NEXT/SAFE/...)에 둘지
4. **재활용 흐름 정의** — 나중에 누가, 언제, 어떻게 이 파일을 다시 쓸지
   - **4-a. 복사 래퍼 결정** — 이 파일을 다시 꺼냈을 때 사용자가 거의 항상 **같은 한 가지 명령**으로 AI에 보내는가?
     - **YES (10번 중 8~9번 같은 행동)** → 래퍼 필수. `FileViewModal.tsx`의 `WRAPPERS` 맵에 폴더 키로 등록. 그 한 줄 명령을 `suffix`로 박는다.
     - **NO (용도 여러 개로 갈림 — 사람 읽기용/AI 컨텍스트용/공유용 등)** → 래퍼 금지. 잘못된 래퍼는 사용자를 잘못된 방향으로 떠민다.
     - **애매하면 일단 없음.** 기본값은 "래퍼 없음". 실사용 데이터 보고 추가.
   - 참고: 현재 NEXT/CURRENT/ANCHORS 는 단일 행동에 수렴해서 래퍼 있음, SUMMARIES/SAFE 는 다용도라 의도적으로 래퍼 없음, DRAFTS 는 역방향 래퍼(prefix+suffix로 "참고용" 차단).

위 4가지(+4-a)가 다 답해지지 않으면 그 기능은 아직 추가할 준비가 안 된 것이다.

### 설계 원칙 — 묶기와 떼어내기

프로젝트는 일관성을 유지해야 하지만, 그 안의 중요한 한 가지는 따로 떼어내서 독립적으로 정리할 수 있어야 한다. 도구가 한쪽으로만 기울면 사용자는 결국 반대 방향이 필요해진다.

- **묶기 도구** (있음): Consolidate(파일 N→1), Compress(대화 압축), Summary(전체 요약)
- **떼어내기 도구** (현재 비어있음): "이 한 주제만 따로 정리" 류의 도구 부재

새 기능 검토 시 항상 자문할 것: **"이게 묶는 쪽인가, 떼어내는 쪽인가?"** 묶기로만 자꾸 기울고 있다면 떼어내기 쪽 빈자리를 한 번 더 살펴본다. (떼어내기 사례가 실제로 자주 부딪힐 때 도구화 — 동결 정책은 유지)

## Run & Operate

- `restart_workflow artifacts/ai-flow: web` — 메인 웹 앱 (이 제품 본체)
- `pnpm --filter @workspace/ai-flow run typecheck` — ai-flow 타입 체크
- `pnpm run typecheck` — 전체 패키지 타입 체크
- `pnpm run build` — 전체 빌드 (typecheck + build)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- 프론트: React + Vite + Tailwind + framer-motion + lucide-react
- PWA: vite-plugin-pwa (manifest + 서비스 워커, 데스크톱 설치 가능)
- 저장소: localStorage (세션 상태) + File System Access API (로컬 폴더, Chrome/Edge만)
- Validation: Zod (`zod/v4`)
- 백엔드/DB는 현재 미사용 (의도적으로 프론트엔드 온리)

## Where things live

- `artifacts/ai-flow/src/components/Sidecar.tsx` — 사이드바 + 패널 UI 본체. **현재 표준 프롬프트들도 이 파일 안의 상수로 존재**한다. 프롬프트가 많아지면 `src/lib/prompts.ts`로 분리 예정.
- `artifacts/ai-flow/src/components/TodayDashboard.tsx` — "오늘" 탭. 시작/종료 모드 토글. 분 단위 tick으로 시간/날짜 경계 갱신.
- `artifacts/ai-flow/src/components/SaveReminderToast.tsx` — 1시간 무저장 시 토스트. `markActivity()` 호출로 활동 시각 갱신 (copy/save/edit 시).
- `artifacts/ai-flow/src/lib/workspace.ts` — `getFilesToday`, `getFilesInFolderByName`, `getMostRecentFile`, `parseFileMeta` 헬퍼.
- `artifacts/ai-flow/src/lib/fsAccess.ts` — File System Access API 래퍼
- `artifacts/ai-flow/public/icon*.png`, `icon.svg` — PWA 아이콘
- `artifacts/ai-flow/vite.config.ts` — PWA 매니페스트 설정

## Architecture decisions

- **AI 비연결 원칙**: 외부 AI API를 호출하지 않는다. 모든 AI 작업은 사용자의 카피-페이스트를 거쳐 이뤄진다. 이건 비용·프라이버시·신뢰의 핵심 디자인 결정.
- **프론트엔드 온리**: 백엔드와 DB가 없다. 모든 상태는 사용자의 브라우저(localStorage) 또는 로컬 폴더(File System Access API)에 저장된다.
- **사이드 패널 모드**: `window.innerWidth <= 440`일 때 사이드 패널로 인식. 팝업으로 열린 창에서만 `window.resizeTo`로 자동 폭 조절(58px ↔ 380px).
- **PWA 설치 가능**: 사용자가 OS 앱처럼 설치해 ChatGPT/Claude 옆에 항상 띄워둘 수 있게 함. dev/prod 모두 매니페스트 활성화.

## Product

### 패널 탭 구조 (현재)

- **오늘** (기본 탭) — 시작 화면: 이어가기(최근 파일) / 현재 / 다음 / 핵심 결정. 하단 "오늘 일 마치기" 버튼 → 종료 화면: 오늘 저장한 것 / 오늘의 핵심 결정 / 내일 이어갈 것.
- **Prompts** — 7개 표준 프롬프트. (SESSION STATE 입력 칸은 제거됨 — 무의미한 sticky note였음)
- **Workspace** — 파일/폴더 관리.

### 저장 알림

1시간 동안 copy/save/edit 활동이 없으면 화면 하단에 토스트로 "잠깐 정리하시겠어요?" 노출. [지금 저장]/[1시간 뒤]/X 액션. 모달·온보딩·활성 프롬프트가 열려 있을 땐 자동 억제. 간격은 `SaveReminderToast.tsx`에서 하드코딩(1시간) — 추후 실사용 후 설정화 결정.

### 사이드바 아이콘 (현재)

| 아이콘 | 기능 | 표준 프롬프트 출력 | 저장 폴더 |
|------|-----|-----------------|---------|
| 📋 클립보드에서 저장 | 카피한 AI 응답을 1클릭으로 저장. 메타 헤더 있으면 해당 폴더, 없으면 DRAFTS | — (사용자의 AI 응답 자체) | 메타 기반 자동 / 없으면 DRAFTS |
| Resume | 작업 재개 프롬프트 | ✅ 공통 메타 헤더 + filename | CURRENT |
| Summary | 작업 요약 | ✅ 공통 메타 헤더 + filename | SUMMARIES |
| Anchors | 핵심 결정 추출 | ✅ 공통 메타 헤더 + filename | ANCHORS |
| Compress | 컨텍스트 압축 | ✅ 공통 메타 헤더 + filename | CURRENT |
| Next | 다음 할 일 추출 | ✅ 공통 메타 헤더 + filename | NEXT |
| Backup | 큰 수정 전 안전망 스냅샷 | ✅ 메타데이터 헤더 포함 | SAFE |
| Restore | 백업으로 컨텍스트 복원 | (입력 프롬프트 — 메타 헤더 N/A) | CURRENT |
| 🚨 SOS | 위기 상황 가이드 모달 (Compress/Backup/Restore로 라우팅) | — | — |
| Workspace | 로컬 폴더 연결 / 파일 관리 / 다중 선택 → 🗂 Consolidate | — | — |
| 🗂 Consolidate | (Workspace 내) 옛 파일 N개 선택 → AI에게 합치기 프롬프트 자동 생성 | ✅ 메타 헤더 + `consolidated_from` + filename | 결과 저장 시 자동 라우팅 (kind 따라) |
| Install (조건부) | PWA 설치 — `beforeinstallprompt` 받았고 미설치일 때만 노출 | — | — |

### 해결하려는 사용자 문제 (10개)

| # | 문제 | 현재 커버 | 메모 |
|---|------|---------|-----|
| 1 | 어디까지 작업했는지 잊어버림 | 🟢 Resume + CURRENT | |
| 2 | 다음 할 일 흐려짐 | 🟢 Next + NEXT | |
| 3 | 수정하다 원본 망침 | 🟢 Backup Snapshot + SAFE | |
| 4 | 백업 누락 | 🟢 Backup Snapshot + SAFE | risk_level/restoration_hint 메타로 강화 |
| 5 | AI가 현재 상태 모름 | 🟢 Compress | |
| 6 | 결정 이유 기억 흐려짐 | 🟢 Anchors | 메타데이터 헤더 추가 시 더 강해짐 |
| 7 | 재진입 어려움 | 🟡 Resume + 온보딩 카드 | 앱 시작 시 최근 CURRENT 자동 표시하면 더 강해짐 |
| 8 | AI/인간 컨텍스트 잃음 | 🟢 Summary + Compress | |
| 9 | 인지 과부하 | 🟡 SOS 모달 | 위기 상황에 3개 카드만 보여줌으로써 일부 해결. 평상시 과부하는 미해결 |
| 10 | 프로젝트 살아있는 느낌 사라짐 | 🔴 없음 | 타임라인 뷰 후보 |

## 다음 작업 후보 (우선순위순)

> **⛔ 신규 기능 추가 동결.** 사용자 결정: Consolidate 이후로 새 기능은 자제. 아래 항목은 실제 사용 압박이 명확히 관찰될 때만 검토.

1. **메타 기반 검색·필터** (Workspace 탭) — 파일 늘어나면 "찾기" 가 정리 압박을 대체. 동결 해제 시 1번 후보.
2. **앱 시작 시 최근 CURRENT 자동 표시** (문제 #7) — 작은 작업으로 재진입 마찰 크게 감소
3. **타임라인 뷰** (문제 #10) — 메타 헤더의 `created_at`/`kind`/`summary`를 시간순으로 한 화면에. 산발적 사용자에게 특히 가치.
4. **ARCHIVE 폴더 + 수동 이관** — Consolidate 후 원본 처리 흐름이 정착되면 자연스럽게 따라옴
5. **SOS 모달 시나리오 확장** — 지금은 3가지. "AI가 너무 길게 답함", "방향이 헷갈림" 추가 후보
6. **자동 파싱 UX 보강** — kind→폴더 매칭 실패 시 "기본 폴더를 찾지 못함" 안내 토스트, CRLF 입력 호환 테스트
7. **파일명 시각 자동 접미사** (`_YYYYMMDD_HHmm`) — 충돌 모달로 일단 해결됨. 충돌이 자주 발생하면 그때

### 완료된 항목 (참고)
- ✅ 7개 프롬프트 모두 메타데이터 헤더 (version/created_at/kind/summary + filename 줄)
- ✅ 저장 모달 자동 파싱: 붙여넣기만 하면 폴더·종류·파일명 자동 인식, "✨ 자동 인식됨" 배지로 사용자에게 알림. 사용자가 수동 편집한 필드는 덮어쓰지 않음 (`touched` 플래그)
- ✅ 워크플로별 Today 라벨 (`TODAY_LABELS` 5개 × 12 키, `getTodayLabels()`)
- ✅ Today 탭 워크플로 필터: 파일 헤더 `workflow:` 가 활성 모드와 불일치하면 숨김. `workflow: common` 과 legacy(필드 없음) 는 항상 표시. 숨김 개수 배너 + Workspace 탭으로 이동 버튼. common 파일엔 🛟 배지. `parseFileMeta` 캐시로 리렌더 비용 절감.
- ✅ **파일명 슬러그 가이드 강화** (`prompts.ts`): `[short-slug]` → `[3-5 lowercase hyphenated words describing the SPECIFIC topic]` + 금지어 리스트(notes/update/summary/session/work/today) + 한국어 슬러그 옵션. Backup은 별도 가이드("before-router-refactor" 류).
- ✅ **같은 이름 저장 충돌 감지** (`SaveResultModal.tsx`): 폴더 내 동일 이름(대소문자 무시) 감지 시 노란 경고 박스 + 라디오(새로 만들기 `_N` 자동 / 덮어쓰기). 기본 "새로 만들기" — 데이터 안전 우선. 덮어쓰기 선택 시 `ws.updateFile` 로 동일 id 갱신 → localStorage·디스크 두 저장소 어긋남 자동 해결. 디스크 폴더 연결된 경우 경고 문구에 "옛 파일이 사라집니다" 명시.
- ✅ **🗂 Consolidate — 옛 파일 합치기** (`prompts.ts:getConsolidatePrompt`, `WorkspaceView.tsx`, `Sidecar.tsx:handleConsolidate`): Workspace 탭에 "선택" 모드 토글 → 체크박스로 N개 선택 → 하단 "합치기" 액션바 클릭 → 우리가 표준 프롬프트 + 모든 파일 내용을 합쳐 활성 프롬프트 패널로 전달 → 사용자가 카피 → AI 응답 받아 📋 클립보드 저장. 원본은 **자동 삭제 X** (사용자가 결과 확인 후 직접 결정). 메타 헤더에 `consolidated_from` 필드 추가로 합쳐진 원본 추적 가능. 우리 시그니처 패턴(표준 프롬프트 → AI → 결과 저장) 의 확장이라 신규 모달/저장 흐름 없음.

## User preferences

- 솔직한 의견과 제안을 적극적으로 공유할 것. 사용자는 파트너로서 함께 설계하길 원함.
- 거창한 약속(예: "자동 백업")을 할 땐 반드시 기술적으로 가능한지 먼저 확인할 것. 못 하면 솔직히 인정하기.
- 의사결정 옵션은 (A)/(B)/(C) 식으로 명확히 제시.
- 한국어로 응답.
- **참고용/인쇄용 정보 전달 시 항상 파일로** — `replit.md` 내용 조회, 검토 문서, 정리된 요약 등을 사용자에게 줄 때는 채팅에 줄줄이 쓰지 말고 인쇄 가능한 파일(.txt 또는 .md)로 만들어 `present_asset` 으로 전달. 채팅 메시지는 복붙·인쇄가 깨짐.

## Gotchas

- **PWA dev 모드**: `devOptions.enabled: true` 가 켜져 있어야 dev에서도 매니페스트와 서비스 워커가 노출됨.
- **`window.resizeTo`**: `window.open`으로 띄운 창에서만 동작. 일반 탭에선 무시되므로 try/catch로 감싸야 함.
- **File System Access API**: Chrome/Edge 한정. Firefox/Safari에선 명시적으로 "지원 안 됨" UI를 보여줘야 함.
- **루트에서 `pnpm dev` 금지**: 워크플로로 실행할 것. 환경변수(PORT, BASE_PATH) 주입은 워크플로 설정이 담당.
- **`Sidecar.tsx`가 핵심 진입점**: 5개 프롬프트와 워크스페이스 UI가 모두 여기 있음. 새 아이콘 추가 시 여기를 손대게 됨.

## Pointers

- 워크스페이스 구조와 규칙은 `pnpm-workspace` 스킬 참조.
