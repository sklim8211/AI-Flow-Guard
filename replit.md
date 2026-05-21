# Quiet Question Sidecar (QQ Sidecar)

AI(ChatGPT/Claude)로 작업하는 비전문가가 **컨텍스트를 잃지 않도록** 도와주는 떠 있는 사이드카 유틸리티. AI에 연결되지 않은 "안전망"이다.

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

위 4가지가 다 답해지지 않으면 그 기능은 아직 추가할 준비가 안 된 것이다.

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
- `artifacts/ai-flow/src/lib/fsAccess.ts` — File System Access API 래퍼
- `artifacts/ai-flow/public/icon*.png`, `icon.svg` — PWA 아이콘
- `artifacts/ai-flow/vite.config.ts` — PWA 매니페스트 설정

## Architecture decisions

- **AI 비연결 원칙**: 외부 AI API를 호출하지 않는다. 모든 AI 작업은 사용자의 카피-페이스트를 거쳐 이뤄진다. 이건 비용·프라이버시·신뢰의 핵심 디자인 결정.
- **프론트엔드 온리**: 백엔드와 DB가 없다. 모든 상태는 사용자의 브라우저(localStorage) 또는 로컬 폴더(File System Access API)에 저장된다.
- **사이드 패널 모드**: `window.innerWidth <= 440`일 때 사이드 패널로 인식. 팝업으로 열린 창에서만 `window.resizeTo`로 자동 폭 조절(58px ↔ 380px).
- **PWA 설치 가능**: 사용자가 OS 앱처럼 설치해 ChatGPT/Claude 옆에 항상 띄워둘 수 있게 함. dev/prod 모두 매니페스트 활성화.

## Product

### 사이드바 아이콘 (현재)

| 아이콘 | 기능 | 표준 프롬프트 출력 | 저장 폴더 |
|------|-----|-----------------|---------|
| Resume | 작업 재개 프롬프트 | ✅ 공통 메타 헤더 + filename | CURRENT |
| Summary | 작업 요약 | ✅ 공통 메타 헤더 + filename | SUMMARIES |
| Anchors | 핵심 결정 추출 | ✅ 공통 메타 헤더 + filename | ANCHORS |
| Compress | 컨텍스트 압축 | ✅ 공통 메타 헤더 + filename | CURRENT |
| Next | 다음 할 일 추출 | ✅ 공통 메타 헤더 + filename | NEXT |
| Backup | 큰 수정 전 안전망 스냅샷 | ✅ 메타데이터 헤더 포함 | SAFE |
| Restore | 백업으로 컨텍스트 복원 | (입력 프롬프트 — 메타 헤더 N/A) | CURRENT |
| 🚨 SOS | 위기 상황 가이드 모달 (Compress/Backup/Restore로 라우팅) | — | — |
| Workspace | 로컬 폴더 연결 / 파일 관리 | — | — |
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

1. **저장 모달에서 `filename:` 자동 파싱** — 이제 7개 프롬프트 모두 결과물 끝에 `filename: ...md` 한 줄을 남기므로, 붙여넣으면 파일명·폴더 자동 추출하여 저장 제안 (임팩트 큼)
2. **앱 시작 시 최근 CURRENT 자동 표시** (문제 #7) — 작은 작업으로 재진입 마찰 크게 감소
3. **타임라인 뷰** (문제 #10) — 메타 헤더의 `created_at`/`kind`/`summary`를 시간순으로 한 화면에
4. **SOS 모달 시나리오 확장** — 지금은 3가지. "AI가 너무 길게 답함", "방향이 헷갈림" 추가 후보

## User preferences

- 솔직한 의견과 제안을 적극적으로 공유할 것. 사용자는 파트너로서 함께 설계하길 원함.
- 거창한 약속(예: "자동 백업")을 할 땐 반드시 기술적으로 가능한지 먼저 확인할 것. 못 하면 솔직히 인정하기.
- 의사결정 옵션은 (A)/(B)/(C) 식으로 명확히 제시.
- 한국어로 응답.

## Gotchas

- **PWA dev 모드**: `devOptions.enabled: true` 가 켜져 있어야 dev에서도 매니페스트와 서비스 워커가 노출됨.
- **`window.resizeTo`**: `window.open`으로 띄운 창에서만 동작. 일반 탭에선 무시되므로 try/catch로 감싸야 함.
- **File System Access API**: Chrome/Edge 한정. Firefox/Safari에선 명시적으로 "지원 안 됨" UI를 보여줘야 함.
- **루트에서 `pnpm dev` 금지**: 워크플로로 실행할 것. 환경변수(PORT, BASE_PATH) 주입은 워크플로 설정이 담당.
- **`Sidecar.tsx`가 핵심 진입점**: 5개 프롬프트와 워크스페이스 UI가 모두 여기 있음. 새 아이콘 추가 시 여기를 손대게 됨.

## Pointers

- 워크스페이스 구조와 규칙은 `pnpm-workspace` 스킬 참조.
