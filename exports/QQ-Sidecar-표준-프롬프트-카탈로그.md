# QQ Sidecar 표준 프롬프트 카탈로그

이 문서는 QQ Sidecar 앱의 각 아이콘이 클릭됐을 때 사용자에게 카피해주는 **표준 프롬프트의 전체 내용**입니다.

---

## 0. 먼저 알아야 할 것

### 이 앱은 AI에 직접 연결되지 않습니다

```
[QQ Sidecar] ──표준 프롬프트──> 사용자가 카피
                                      ↓
                                AI에 붙여넣기 (ChatGPT/Claude)
                                      ↓
                       AI가 메타데이터 포함된 결과 생성
                                      ↓
        사용자가 결과 카피 ──> [QQ Sidecar가 폴더에 저장]
```

따라서 이 카탈로그의 모든 프롬프트는 **AI에게 보내는 지시문**입니다. 우리 앱은 이걸 만들어 클립보드에 넣어주기만 합니다.

### 모든 프롬프트가 공유하는 메타 헤더 스키마

대부분의 프롬프트는 AI에게 **결과물 맨 위에 다음 형식의 YAML 헤더를 붙이도록** 요청합니다. 이 헤더 덕분에 우리 앱이 결과를 받아 자동으로 폴더 분류·파일명 채우기·검색이 가능합니다.

```yaml
---
version: v1
created_at: 2026-05-24 14:30
workflow: development        # development / writing / research / design / strategy / common
kind: summary                # 어떤 종류의 결과물인지 (이 값이 폴더 분류의 핵심)
summary: 한 줄 설명
keywords: 검색용, 키워드, 3-5개
---
```

그리고 결과물 **마지막 줄에는 다음 형식의 파일명 줄**이 들어옵니다:

```
filename: summary_router-refactor-plan.md
```

`kind_슬러그.md` 형식이고, 슬러그는 **3~5개의 영문 소문자 단어를 하이픈으로 연결**한 것입니다 (한국어 슬러그도 허용). "notes", "update", "summary" 같은 무의미한 단어는 금지됩니다.

### 워크플로별 변형

5개 아이콘(Resume / Summary / Anchors / Next)은 프로젝트의 **워크플로(개발/글쓰기/리서치/디자인/전략)에 따라 같은 아이콘이라도 다른 프롬프트**를 카피해줍니다. 개발자에겐 "아키텍처 상태"를, 작가에겐 "현재 서사 상태"를 묻는 식입니다.

3개 아이콘(Compress / Backup / Restore)은 **공통** — 모든 워크플로에서 동일한 프롬프트를 씁니다.

---

## 1. Resume Work (이어서 작업하기)

**언제 쓰나**: 새 AI 대화창을 열어 이전 작업을 이어갈 때, "내가 어디까지 했었지?"를 AI에게 재구성시키는 용도.
**저장 폴더**: `CURRENT`
**워크플로별 변형**: 있음 (5종)

### 1-1. 개발 (development)

```
You are helping me resume an ongoing software development workflow. Reconstruct the working context for fast re-entry.

Focus on:
- current architecture state
- recent implementation progress
- important technical decisions
- unresolved blockers
- dependencies or assumptions
- what the developer was trying to achieve

Start the output with this YAML metadata header. Use the schema EXACTLY as shown — keep all field names and ordering, but replace every value inside square brackets with a real value. Do NOT keep the brackets or any inline comments in your output.

Schema:

---
version: v1
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: development
kind: resume
summary: [one short single-line description]
keywords: [3-5 comma-separated searchable keywords]
---

Then write the body in this structure:

CURRENT: [where the implementation is right now in 1-2 sentences]
ARCHITECTURE STATE: [key files / modules / boundaries currently in play]
RECENT DECISIONS: [important technical choices worth carrying]
BLOCKERS: [unresolved issues or open questions]
NEXT: [the most important next implementation step]

End the output with ONE line in this exact format:
filename: resume_[slug].md

Where [slug] is 3-5 lowercase English words joined by hyphens that describe the SPECIFIC topic, decision, or task this file is about (e.g. "auth-refactor-plan", "db-migration-rollback", "onboarding-copy-v2"). Do NOT use generic words like "notes", "update", "summary", "session", "work", "today", or the current date — the filename must convey what is unique about THIS file so it can be told apart from other resume files later. If the user pasted Korean content, you may use 2-4 Korean words joined by hyphens instead (e.g. "라우터-리팩터링", "결제-흐름-결정").

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.
```

### 1-2. 글쓰기 (writing)

본문 구조만 다릅니다(나머지 메타·파일명 가이드는 동일):

```
Intro: You are assisting with an ongoing writing and creative workflow. Preserve narrative and creative continuity.

Focus on:
- current narrative state
- emotional direction
- themes and tone
- important character or structural decisions
- unresolved creative questions
- next writing movement

Body:
CURRENT NARRATIVE: [where the piece / story is right now]
TONE & THEMES: [active themes and emotional direction]
RECENT CREATIVE DECISIONS: [structural / character choices to carry]
OPEN THREADS: [unresolved scenes or questions]
NEXT MOVEMENT: [the natural next writing action]
```

### 1-3. 리서치 (research)

```
Intro: You are assisting with an ongoing research workflow. Preserve reasoning continuity and investigative direction.

Focus on:
- current hypothesis
- recent findings
- unresolved uncertainties
- assumptions and evidence
- open research questions
- next investigation step

Body:
CURRENT HYPOTHESIS: [the active working hypothesis]
RECENT FINDINGS: [most important results / observations]
KEY ASSUMPTIONS: [what we are taking for granted]
OPEN QUESTIONS: [unresolved uncertainties]
NEXT STEP: [the next investigative action]
```

### 1-4. 디자인 (design)

```
Intro: You are assisting with an ongoing design workflow. Preserve design intent and usability continuity.

Focus on:
- current design direction
- user experience goals
- visual or interaction decisions
- unresolved UX problems
- feedback and observations
- next design iteration

Body:
CURRENT DIRECTION: [where the design stands right now]
UX GOALS: [what experience we are trying to create]
RECENT DECISIONS: [interaction / visual choices to carry]
OPEN UX PROBLEMS: [unresolved friction]
NEXT ITERATION: [the next design step]
```

### 1-5. 전략·기획 (strategy)

```
Intro: You are assisting with an ongoing product and strategy workflow. Preserve strategic continuity across sessions.

Focus on:
- current product direction
- key assumptions
- strategic decisions
- unresolved risks
- market or user insights
- next strategic action

Body:
CURRENT DIRECTION: [where the product / strategy stands]
KEY ASSUMPTIONS: [what we are betting on]
RECENT DECISIONS: [strategic moves to carry]
OPEN RISKS: [unresolved threats or unknowns]
NEXT STRATEGIC STEP: [the next meaningful action]
```

---

## 2. Work Summary (세션 결과 정리)

**언제 쓰나**: 한 작업 세션이 끝났을 때 "오늘 뭐 했지"를 한 장으로 압축.
**저장 폴더**: `SUMMARIES`
**워크플로별 변형**: 있음 (5종). 메타 헤더/파일명 가이드는 Resume과 동일 패턴, `kind: summary`로 변경.

### 2-1. 개발

```
Intro: You are helping me summarize a software development work session.

Body:
COMPLETED: [things shipped / merged / verified]
TECHNICAL CHANGES: [major code or schema changes]
DISCOVERIES: [things learned mid-session]
UNRESOLVED: [open issues or follow-ups]
DIRECTION: [where the project is headed]
```

### 2-2. 글쓰기

```
Intro: You are helping me summarize an ongoing writing session.

Body:
NARRATIVE PROGRESS: [what advanced in the piece]
EMOTIONAL DEVELOPMENTS: [feelings / dynamics that shifted]
CREATIVE DISCOVERIES: [unexpected directions found]
UNRESOLVED TENSIONS: [open creative questions]
NEXT NARRATIVE DIRECTION: [where to go next]
```

### 2-3. 리서치

```
Intro: You are helping me summarize a research session.

Body:
DISCOVERIES: [what was uncovered]
HYPOTHESIS STATE: [strengthened / weakened / unchanged]
UNRESOLVED UNCERTAINTY: [open questions]
KEY EVIDENCE: [most important data points]
NEXT RESEARCH DIRECTION: [where to dig next]
```

### 2-4. 디자인

```
Intro: You are helping me summarize a design workflow session.

Body:
DESIGN PROGRESS: [what advanced]
USABILITY FINDINGS: [observations / feedback signals]
VISUAL DECISIONS: [choices on type / color / layout]
UNRESOLVED UX: [open friction]
NEXT ITERATION DIRECTION: [where to go next]
```

### 2-5. 전략·기획

```
Intro: You are helping me summarize a product / strategy session.

Body:
STRATEGIC PROGRESS: [what shifted]
KEY INSIGHTS: [user / market signals captured]
DECISIONS MADE: [moves committed to]
OPEN RISKS: [unresolved threats]
NEXT STRATEGIC DIRECTION: [where to focus next]
```

---

## 3. Extract Anchors (핵심 결정 추출)

**언제 쓰나**: "왜 그렇게 결정했더라"를 잊지 않기 위해, 의사결정과 그 이유를 따로 저장.
**저장 폴더**: `ANCHORS`
**워크플로별 변형**: 있음 (5종). `kind: anchors`.

### 3-1. 개발

```
Intro: You are helping me preserve critical engineering decisions from this development workflow.

Focus on:
- important architectural choices
- technical tradeoffs
- reasoning behind decisions
- assumptions worth preserving
- constraints that influenced the direction

Body:
ANCHORS:
- [decision 1]
- [decision 2]
- [decision 3]

TRADEOFFS: [what was given up and why]
CONSTRAINTS: [hard limits that shaped the choice]
WHY IT MATTERS: [why future sessions must not lose this]
```

### 3-2. 글쓰기

```
Focus on:
- emotional anchors
- thematic decisions
- narrative direction
- tone-defining choices
- recurring motifs

Body:
EMOTIONAL ANCHORS:
- [anchor 1]
- [anchor 2]

THEMATIC DECISIONS: [what the piece is really about]
NARRATIVE DIRECTION: [where the arc is headed]
RECURRING MOTIFS: [imagery / symbols to keep alive]
WHY IT MATTERS: [what emotional continuity must remain]
```

### 3-3. 리서치

```
Focus on:
- major findings
- strong assumptions
- weak points in reasoning
- important evidence
- conceptual shifts

Body:
KEY FINDINGS:
- [finding 1]
- [finding 2]

STRONG ASSUMPTIONS: [foundations to keep]
WEAK POINTS: [reasoning that needs more support]
EVIDENCE TO PRESERVE: [sources / data worth re-citing]
WHY IT MATTERS: [what future sessions must remember]
```

### 3-4. 디자인

```
Focus on:
- interaction principles
- visual direction
- usability assumptions
- design tradeoffs
- emotional experience goals

Body:
DESIGN ANCHORS:
- [decision 1]
- [decision 2]

INTERACTION PRINCIPLES: [rules that should not bend]
VISUAL DIRECTION: [tone / style commitments]
TRADEOFFS: [what we accepted losing]
WHY IT MATTERS: [what experience must stay consistent]
```

### 3-5. 전략·기획

```
Focus on:
- product direction shifts
- key assumptions
- market insights
- strategic tradeoffs
- product philosophy decisions

Body:
STRATEGIC ANCHORS:
- [decision 1]
- [decision 2]

KEY ASSUMPTIONS: [bets that shaped the path]
MARKET / USER INSIGHTS: [what we learned]
TRADEOFFS: [what we chose not to chase]
WHY IT MATTERS: [what future sessions should not lose]
```

---

## 4. Next Actions (다음 할 일 목록)

**언제 쓰나**: "그래서 지금 뭘 해야 하지?"가 흐릿할 때, AI에게 우선순위 정리를 시킴.
**저장 폴더**: `NEXT`
**워크플로별 변형**: 있음 (5종). `kind: next`.

### 4-1. 개발

```
Body:
IMMEDIATE: [the single next implementation action]
TODAY: [2-3 things to land today]
THIS WEEK: [1-2 bigger goals for the week]
BLOCKERS: [anything that must be resolved first]
NOTES: [helpful technical context]
```

### 4-2. 글쓰기

```
Body:
NEXT MOVEMENT: [the single next writing action]
EMOTIONAL DIRECTION: [tone / feeling to carry forward]
CONTINUITY REMINDERS: [things to keep consistent across the next pages]
OPTIONAL IDEAS: [1-2 supporting alternatives]
```

### 4-3. 리서치

```
Body:
NEXT INVESTIGATION: [the single next research action]
SECONDARY PATHS: [1-2 alternative angles]
UNCERTAINTY NOTES: [what remains weakly supported]
EVIDENCE NEEDED: [what would settle the question]
```

### 4-4. 디자인

```
Body:
NEXT DESIGN ACTION: [the single next iteration step]
SUPPORTING IDEAS: [1-2 refinements worth trying]
CONTINUITY REMINDERS: [patterns / tokens to keep consistent]
USER IMPACT: [what this should change for the user]
```

### 4-5. 전략·기획

```
Body:
NEXT STRATEGIC ACTION: [the single next move]
SUPPORTING DIRECTIONS: [1-2 reinforcing actions]
CONTINUITY REMINDERS: [what alignment to preserve]
SIGNALS TO WATCH: [what would change the plan]
```

---

## 5. Compress Context (맥락 압축 요약)

**언제 쓰나**: AI 대화가 너무 길어져 컨텍스트가 곧 잘릴 것 같을 때, 핵심만 압축해 새 대화창에 붙여넣기 위함.
**저장 폴더**: `CURRENT`
**워크플로별 변형**: 없음 (공통).

### 전체 프롬프트

```
Please compress everything we know so far into the smallest possible summary I can paste at the start of a new conversation.

Start the output with this YAML metadata header. Use the schema EXACTLY as shown — keep all field names and ordering, but replace every value inside square brackets with a real value. Do NOT keep the brackets or any inline comments in your output.

Schema:

---
version: v1
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: common
kind: compress
summary: [one short single-line description]
keywords: [3-5 comma-separated searchable keywords]
---

Then write the body in this structure:

CONTEXT: [project / task background in 2-3 sentences]
STATE: [exactly where we are right now]
CONSTRAINTS: [important limits or requirements]
NEXT: [the first action to take]

Make it dense and paste-ready.

End the output with ONE line in this exact format:
filename: compress_[slug].md

Where [slug] is 3-5 lowercase English words joined by hyphens that describe the SPECIFIC topic... (이하 공통 슬러그 가이드 동일)

Wrap the entire output inside a single fenced markdown code block.
```

---

## 6. Backup Snapshot (큰 수정 전 안전망)

**언제 쓰나**: 큰 리팩터링·리라이트·구조 변경 직전, "망쳤을 때 돌아갈 수 있는 한 장"을 만들어둠.
**저장 폴더**: `SAFE`
**워크플로별 변형**: 없음 (공통).
**특별한 점**: 메타 헤더가 일반 5개 프롬프트보다 풍부합니다. `version: vN` 자동 증가, `risk_level`(low/medium/high), `changes_from_previous`, `restoration_hint` 필드 포함. 파일명도 `backup_v[N]_[slug].md` 형식.

### 전체 프롬프트

```
Please create a complete BACKUP SNAPSHOT of our current work state. This will be saved as a safety net before making a large or risky change.

Start the output with this YAML metadata header. Use the schema EXACTLY as shown — keep all field names and ordering, but replace every value inside square brackets with a real value. Do NOT keep the brackets or any inline comments in your output.

Schema:

---
version: [vN — next number if previous backups exist in this conversation, otherwise v1]
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: common
kind: backup
summary: [one short single-line summary of the current state]
changes_from_previous: |-
  - [bullet 1: what changed since previous backup]
  - [bullet 2 (optional)]
  - [bullet 3 (optional)]
  (write a single line "first backup" instead of bullets if this is v1)
restoration_hint: [single line — what someone needs to know to restore from this snapshot]
risk_level: [exactly one of: low | medium | high]
---

Then write the body in this structure:

1. CURRENT STATE — exactly where we are right now (2-3 sentences)
2. IN PROGRESS — what's actively being worked on
3. NEXT STEPS — the upcoming actions in order
4. DECISIONS & REASONS — important decisions made so far and why
5. CRITICAL INFO — anything that absolutely must not be lost (file paths, IDs, configs, exact values)
6. KNOWN RISKS — what could go wrong next, and how to recover

End the output with ONE line in this exact format (the [N] number MUST match the version number you used in the header):
filename: backup_v[N]_[slug].md

Where [slug] is 3-5 lowercase English words joined by hyphens describing what THIS backup is specifically protecting (e.g. "before-router-refactor", "pre-payment-migration"). Do NOT use generic words like "backup", "snapshot", "before-changes", or the current date — the slug must tell future-you exactly what state this snapshot captures. Korean is allowed if the working content is in Korean (e.g. "라우터-리팩터-직전").

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.
```

### 왜 슬러그 가이드가 다른가
일반 5개 프롬프트는 "주제"를 슬러그로 쓰지만, Backup은 **"직전 상태"**를 가리키는 게 더 자연스럽기 때문에 `before-router-refactor`, `pre-payment-migration` 같은 패턴을 권장합니다.

---

## 7. Restore From Backup (백업으로 컨텍스트 복원)

**언제 쓰나**: 작업이 꼬여서 이전 백업으로 돌아가고 싶을 때. SAFE 폴더의 백업 파일 내용을 통째로 AI에 붙이면, AI가 그 시점의 상태를 재구성해 알려줌.
**저장 폴더**: `CURRENT` (복원된 컨텍스트를 새 CURRENT로 사용)
**워크플로별 변형**: 없음 (공통).
**특별한 점**: **이건 결과물에 메타 헤더를 요구하지 않습니다.** AI에게 "백업을 읽고 설명하라"는 입력 프롬프트라서, 사용자가 받은 응답은 일반 텍스트입니다. (저장하려면 사용자가 수동 분류)

### 전체 프롬프트

```
I need to restore my working context from a backup snapshot. Below this message I will paste the full backup file content (it has a metadata header with version, created_at, workflow, summary, changes_from_previous, restoration_hint, risk_level, followed by the body).

Please:

1. Read the metadata header and confirm out loud: which version, when it was created, the summary, and the risk_level.
2. Reconstruct the full working context from the body: current state, in-progress work, next steps, key decisions, and critical info.
3. Highlight anything in "restoration_hint" that I should be careful about.
4. Tell me the SINGLE most important action to take right now to safely continue from this snapshot.
5. List anything in the backup that looks stale or might no longer apply (best-effort guess, clearly marked as a guess).

Rules:
- Do NOT invent details that aren't in the backup.
- If something critical is missing or ambiguous, ASK me a clarifying question instead of guessing.
- If the section below is empty or does not contain a metadata header, STOP and ask me to paste the full backup file first.
- Keep the response structured and scannable, not a wall of prose.

--- BACKUP FILE CONTENT BELOW ---

[paste backup file here]
```

### 사용 흐름
1. Restore 아이콘 클릭 → 위 프롬프트가 활성 패널에 뜸
2. 사용자가 카피
3. SAFE 폴더에서 복원하고 싶은 백업 파일 열기 → 그 내용도 카피
4. AI에 위 프롬프트 붙이고, 마지막 `[paste backup file here]` 자리에 백업 내용 붙임
5. AI가 그 시점의 작업 상태를 재구성해 설명

---

## 8. 🗂 Consolidate (옛 파일 합치기)

**언제 쓰나**: 같은 주제로 쌓인 옛 파일 N개를 한 장으로 묶고 싶을 때. Workspace 탭에서 "선택" 모드 → 체크박스로 ≥2개 선택 → "합치기" 액션바 클릭.
**저장 폴더**: 결과의 `kind` 필드에 따라 자동 분류
**워크플로별 변형**: 없음 (공통).
**특별한 점**:
- 우리 앱이 **선택된 파일 내용을 프롬프트 끝에 자동으로 첨부**합니다 (사용자가 직접 안 붙여도 됨)
- 결과물 메타 헤더에 **`consolidated_from`** 필드가 추가됨 — 어떤 원본들에서 합쳤는지 추적 가능
- **원본은 자동 삭제 X** — 통합본을 확인한 사용자가 직접 결정
- 파일명 패턴: `[kind]_consolidated-[슬러그].md`

### 전체 프롬프트 (N = 선택한 파일 수)

```
I have N previously-saved files about the same project. Please MERGE them into ONE consolidated file that preserves the important content from all of them while removing redundancy.

Source files are listed below, separated by `===== FILE X: <name> =====` markers. They are in chronological order (oldest first). Treat later files as more recent / authoritative when information conflicts.

Please:

1. Read every source file.
2. Produce a single consolidated output that keeps every unique fact, decision, and detail. Only drop redundancy and information that newer files have clearly superseded.
3. If sources disagree, prefer the newest one and add a brief note like "(updated from earlier version)".
4. Do NOT invent new content. Only merge what exists in the sources.

Start the output with this YAML metadata header (replace bracketed values, do not keep brackets):

---
version: v1
created_at: [YYYY-MM-DD HH:mm in local time]
workflow: [copy the workflow value from the sources — if they differ, use "common"]
kind: [copy the kind from the sources — if they differ, use the most common one]
summary: [one short single-line description that says this is a consolidation of N files]
keywords: [3-5 comma-separated searchable keywords drawn from the merged content]
consolidated_from: [comma-separated list of the source filenames]
---

Then write the merged body. Keep section headings if the sources used them. Organize content so a future reader can pick this single file up and have the full picture without needing the originals.

End the output with ONE line in this exact format:
filename: [kind]_consolidated-[3-5 hyphenated words describing the merged topic].md

Where [kind] matches the kind field in the header, and the slug describes what was merged (e.g. "consolidated-auth-decisions", "consolidated-week3-progress"). Do NOT use generic words like "files", "merge", "combined", or the current date.

Wrap the entire output (header + body + filename line) inside a single fenced markdown code block so I can copy it as one piece.

===== SOURCE FILES =====

(우리 앱이 선택한 파일들의 내용을 여기에 자동으로 첨부)
```

---

## 9. 📋 클립보드에서 저장 (참고 — 프롬프트 아님)

이 아이콘은 **프롬프트를 카피해주는 게 아니라**, 사용자가 이미 AI로부터 받아 클립보드에 카피한 응답을 저장하는 입구입니다. 따라서 표준 프롬프트가 없습니다.

자동 작동:
1. 클립보드 내용을 읽음
2. 첫머리에 메타 헤더(YAML) 있으면 → `kind` 필드로 폴더 자동 분류, `filename:` 줄로 파일명 자동 채움 → "✨ 자동 인식됨" 배지 표시
3. 메타 헤더 없으면 → `DRAFTS` 폴더에 임시 저장 (사용자가 수동 분류)

---

## 10. 🚨 SOS (참고 — 프롬프트 아님)

이 아이콘은 **위기 상황 가이드 모달**이라서 자체 프롬프트가 없습니다. 다음 3개 카드를 보여주고 사용자가 고르면 해당 표준 프롬프트로 라우팅:

- "지금 너무 길어졌어요" → **Compress**
- "큰 수정 직전이에요" → **Backup**
- "꼬여서 되돌리고 싶어요" → **Restore**

---

## 부록 A — 슬러그 네이밍 규칙 (모든 프롬프트 공통)

AI가 파일명을 만들 때 따라야 하는 규칙:

- **형식**: 3~5개 소문자 영문 단어를 하이픈으로 연결
- **요구**: 이 파일만의 SPECIFIC한 주제·결정·작업을 표현
- **금지어**: `notes`, `update`, `summary`, `session`, `work`, `today`, 날짜
- **좋은 예**: `auth-refactor-plan`, `db-migration-rollback`, `onboarding-copy-v2`
- **한국어 허용**: 사용자 작업이 한국어면 `라우터-리팩터링`, `결제-흐름-결정` 같은 한글 슬러그도 OK
- **Backup만 다름**: "직전 상태"를 표현 (`before-router-refactor`, `pre-payment-migration`)
- **Consolidate만 다름**: `consolidated-` 접두사 사용 (`consolidated-auth-decisions`)

이 규칙 덕분에 파일이 수십 개 쌓여도 이름만 보고 내용을 짐작할 수 있습니다.

---

## 부록 B — kind ↔ 폴더 매핑

| `kind` | 자동 저장 폴더 |
|--------|-----------|
| `resume` | CURRENT |
| `compress` | CURRENT |
| `summary` | SUMMARIES |
| `anchors` | ANCHORS |
| `next` | NEXT |
| `backup` | SAFE |
| (Consolidate는 합쳐진 원본의 kind를 따라감) | 자동 라우팅 |

매핑이 실패하면 `DRAFTS` 폴더로 저장됩니다.

---

*문서 생성일: 2026-05-24 / 출처: `artifacts/ai-flow/src/lib/prompts.ts`*
