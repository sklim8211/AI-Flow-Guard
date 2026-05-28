# GitHub 에 프로젝트 올리기 (Replit 에서)

작성일: 2026-05-27

---

## 가장 쉬운 방법 — Replit 내장 Git 연동

### 1단계: GitHub 계정 연결 (한 번만)

1. Replit 화면 왼쪽 사이드바에서 **계정 아이콘** (또는 좌하단 본인 프로필) 클릭
2. **Account** → **Connected Services** (연결된 서비스)
3. **GitHub** 옆 **Connect** 클릭 → GitHub 로그인 → 권한 승인

### 2단계: 이 프로젝트를 GitHub 에 푸시

1. Replit 화면 왼쪽 사이드바에서 **Git** 아이콘 클릭 (브랜치 모양 아이콘)
2. 처음이면 **"Initialize Git Repository"** 또는 **"Connect to GitHub"** 버튼 보임 → 클릭
3. **Create a new repository on GitHub** 선택
4. 저장소 이름 입력 (예: `qq-sidecar`)
5. **Public** 또는 **Private** 선택
6. **Create & Push** 클릭

→ 끝. GitHub 에 자동으로 새 레포 만들어지고 코드 다 올라감.

---

## 두 번째 방법 — 이미 GitHub 에 빈 레포가 있는 경우

GitHub 에서 먼저 빈 레포 만들고 URL 복사 → Replit Shell 에서:

```bash
git remote add origin https://github.com/사용자명/레포명.git
git branch -M main
git push -u origin main
```

(GitHub 로그인 토큰 물어보면 GitHub 의 Personal Access Token 사용)

---

## 이후 변경사항 올리기

처음 한 번 연결한 다음부터는:

1. Replit 좌측 **Git 아이콘** 클릭
2. 변경된 파일 목록 보임
3. 하단 **commit message** 칸에 무엇을 바꿨는지 한 줄 적기
4. **Stage and commit all changes** 클릭
5. **Push** 클릭

→ GitHub 에 반영됨.

---

## 주의사항

### Vercel 과 연동하려면
GitHub 에 푸시한 후 Vercel 대시보드에서:
- **New Project** → **Import Git Repository** → 방금 푸시한 레포 선택
- vercel.json 자동 감지됨
- Deploy 클릭

이렇게 하면 앞으로 GitHub 에 push 할 때마다 Vercel 이 자동 재배포함.

### 민감 정보 확인
푸시 전에 `.env` 같은 비밀 파일이 안 올라가는지 확인. Replit 의 Secrets 는 `.env` 와 다르게 별도 관리되니 보통 안전하지만, 혹시 본인이 만든 `.env` 파일 있으면 `.gitignore` 에 추가 필요.

### 현재 프로젝트 크기
- 코드는 다 올라가도 OK
- `node_modules/` 는 자동으로 `.gitignore` 에 포함되어 있어 안 올라감
- `dist/` 빌드 결과물도 보통 안 올림 (Vercel 이 직접 빌드함)

---

## 막히면 알려주세요

연결이 안 되거나 권한 오류가 나면 어디서 막혔는지 알려주시면 그 단계만 같이 보겠습니다.
