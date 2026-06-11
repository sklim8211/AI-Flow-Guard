import { useEffect, useRef, useState, useCallback } from "react";
import "./index.css";

type Lang = "ko" | "en";

type Section = {
  quote: string;
  problemHeading?: string;
  problemTitle: string;
  problemBody: string[];
  problemBullets?: string[];
  solveTitle: string;
  solveLead: string;
  example?: { label: string; lines: { k: string; v: string }[] };
  closing?: string;
};

type FaqItem = {
  q: string;
  a: string;
};

type Copy = {
  htmlLang: string;
  badge: string;
  heroH1: string;
  heroTagline: string;
  heroSub1: string;
  ctaOpen: string;
  ctaSeeHow: string;
  trustShort: string;
  introH2: string;
  introP1a: string;
  introP1b: string;
  introP2: string;
  introP3: string;
  problemLabel: string;
  howLabel: string;
  ctaH2: string;
  ctaLead: string;
  ctaTrust: string;
  footer: string;
  whoLabel: string;
  whoTitle: string;
  whoItems: string[];
  whenLabel: string;
  whenTitle: string;
  whenItems: string[];
  faqLabel: string;
  faqTitle: string;
  faqItems: FaqItem[];
  sections: Section[];
};

const EN: Copy = {
  htmlLang: "en",
  badge: "Sidecar — a quiet workspace next to your AI",
  heroH1: "Your AI chat is still there. Your working state isn't.",
  heroTagline:
    "For builders, developers, and researchers running long projects across ChatGPT, Claude, and Cursor.",
  heroSub1:
    "Sidecar saves your working state, decisions, and next steps to your own local folder — so you can restart long AI work without rebuilding context from scratch.",
  ctaOpen: "Open Sidecar",
  ctaSeeHow: "See how it helps",
  trustShort: "No account. Runs in your browser. Saves to your folder, not ours.",
  introH2: "Why long AI work becomes exhausting",
  introP1a: "Most AI tools preserve conversations.",
  introP1b:
    "But they do not preserve workflow continuity, reasoning structure, project momentum, or restart position.",
  introP2:
    "So every time you return, you spend energy reconstructing context again. That creates restart fatigue, confusion, repeated explanations, and broken momentum.",
  introP3:
    "The conversation still exists. But the working state of the project does not.",
  problemLabel: "Problem",
  howLabel: "How Sidecar helps",
  ctaH2: "Try Sidecar on your next AI session.",
  ctaLead: "No account needed. Runs in your browser. Saves to your folder, not ours.",
  ctaTrust:
    "Your AI conversations never leave your screen. Sidecar doesn't connect to ChatGPT, Claude, or anything else. It just helps you keep track.",
  footer: "© {year} Sidecar. Made for people who work with AI for real.",
  whoLabel: "Who it's for",
  whoTitle: "Built for people who work with AI across many sessions.",
  whoItems: [
    "Solo builders shipping projects over days and weeks, not minutes.",
    "Developers using ChatGPT, Claude, or Cursor for ongoing work.",
    "Researchers and writers managing long, evolving threads.",
    "Anyone who feels restart fatigue when reopening AI work.",
  ],
  whenLabel: "When to use it",
  whenTitle: "Reach for Sidecar when the work outlasts a single chat.",
  whenItems: [
    "When a project lasts more than one session.",
    "When important reasoning gets buried in long chats.",
    "When you need to preserve decisions and next steps.",
    "When restarting feels harder than the work itself.",
  ],
  faqLabel: "FAQ",
  faqTitle: "Questions, answered plainly.",
  faqItems: [
    {
      q: "Does Sidecar connect to my ChatGPT or Claude account?",
      a: "No. Sidecar runs entirely in your browser and never connects to ChatGPT, Claude, or any third-party AI API. You copy what matters into Sidecar yourself.",
    },
    {
      q: "Can I use Sidecar alongside ChatGPT, Claude, or Cursor?",
      a: "Yes. Sidecar sits next to whatever AI tool you use. It's tool-agnostic — anything you can copy, you can preserve.",
    },
    {
      q: "Does Sidecar store my conversations on your servers?",
      a: "No. Everything saves to your own local folder. There are no accounts and no servers holding your work.",
    },
    {
      q: "Is this only for coding, or also for research and writing?",
      a: "Any long AI work. Resume, Anchors, and Snapshots apply just as well to research, writing, and planning as they do to code.",
    },
  ],
  sections: [
    {
      quote: "“Wait… what were we doing again?”",
      problemHeading: "Problem: Lost Chat Context & AI Restart Fatigue",
      problemTitle:
        "If you work with AI for hours or days, this probably feels familiar.",
      problemBody: [
        "You come back later.\nThe chat is still there.\nBut the working state of the project is gone.",
        "You're not lost because the AI failed.\nYou're lost because continuity has to live somewhere —\nand chat history isn't it.",
      ],
      solveTitle: "Resume",
      solveLead:
        "Resume saves your project's working state in a structured format. Instead of rereading long chats, you instantly restore where things stand, what matters now, and what's next.",
      example: {
        label: "Example",
        lines: [
          { k: "CURRENT", v: "Landing page direction finalized" },
          { k: "NEXT", v: "Refine onboarding structure" },
          { k: "ISSUE", v: "Need clearer explanation for first-time users" },
        ],
      },
      closing:
        "Not just a note — a recoverable workflow state, so you and the AI continue from the same point.",
    },
    {
      quote: "“I know it's somewhere in the chat.”",
      problemHeading: "Problem: Buried Decisions in Long AI Conversations",
      problemTitle:
        "Long AI conversations become difficult to navigate over time.",
      problemBody: [
        "Important ideas and decisions get buried inside large threads.",
        "The chronological chat list is basically a graveyard. You know the answer exists. You just can't find it anymore.",
      ],
      problemBullets: [
        "important reasoning disappears inside long conversations",
        "project decisions lose context",
        "users forget why certain directions were chosen",
      ],
      solveTitle: "Anchors",
      solveLead:
        "Anchors preserve key decisions and the reasoning behind them — not just the output, but why you chose this direction and what should stay consistent.",
      closing:
        "Restore the decision path directly, instead of rediscovering the same reasoning each time.",
    },
    {
      quote: "“I don't lose the code.\nI lose the reasoning.”",
      problemHeading: "Problem: Disappearing Reasoning in LLM Coding Sessions",
      problemTitle: "A month later you can find the files.\nWhat disappears is why things ended up that way.\nThe what survives. The why doesn't.",
      problemBody: [
        "You reopen a project and spend energy trying to remember what kind of document this is, what role it plays, and how it connects to the workflow.",
        "Users often return later and ask:",
      ],
      problemBullets: [
        "Is this the latest version?",
        "Is this a summary or a working document?",
        "Why was this saved?",
        "How does this connect to the project?",
      ],
      solveTitle: "Metadata Headers",
      solveLead:
        "Metadata Headers let you and the AI see a file's role at a glance — what it is, why it exists, and how it fits.",
      example: {
        label: "Example",
        lines: [
          { k: "kind", v: "resume" },
          { k: "summary", v: "current workflow state" },
          { k: "keywords", v: "workflow, continuity, metadata" },
        ],
      },
      closing: "The goal is not just storage. The goal is recoverable context.",
    },
    {
      quote: "“The work exists. But the momentum is gone.”",
      problemHeading: "Problem: Lost Momentum in Long AI Collaborations",
      problemTitle: "Restarting work often feels heavier than the work itself.",
      problemBody: [
        "Files survive. Chats survive. Outputs survive. But the feeling of where the project was going often disappears.",
        "Especially in long AI collaboration:",
      ],
      problemBullets: [
        "reasoning fades",
        "priorities shift",
        "unresolved issues disappear",
        "emotional momentum is lost",
      ],
      solveTitle: "Summary & Snapshot",
      solveLead:
        "Summary and Snapshot capture the workflow at key moments — what's done, what mattered, and where to resume later.",
      closing:
        "This turns stopping into a recoverable pause instead of a hard interruption.",
    },
    {
      quote: "“It feels like I'm building infrastructure that should exist.”",
      problemHeading: "Problem: Static Folders That Don't Preserve Workflow",
      problemTitle:
        "Most folders only store files. They do not preserve workflow.",
      problemBody: [
        "Over time, folders become archives instead of working systems.",
        "Users accumulate chats, notes, drafts, and outputs — but lose the thread that ties them together.",
      ],
      solveTitle: "A folder that knows what it holds",
      solveLead:
        "Sidecar sorts work into clear roles — now, next, and what to keep safe before a big change. Each file carries its own metadata, so the folder reads itself.",
      example: {
        label: "Folders",
        lines: [
          { k: "CURRENT", v: "what the project is right now" },
          { k: "NEXT", v: "what should happen next" },
          { k: "SAFE", v: "snapshots taken before large changes" },
          { k: "ANCHORS", v: "decisions and reasoning to keep" },
        ],
      },
      closing:
        "Instead of an archive of files, the folder becomes a living map of the project.",
    },
  ],
};

const KO: Copy = {
  htmlLang: "ko",
  badge: "Sidecar — AI 옆에 조용히 두는 작업 공간",
  heroH1: "대화는 그대로인데, 작업 상태는 사라졌습니다.",
  heroTagline:
    "ChatGPT, Claude, Cursor로 긴 프로젝트를 이어가는 빌더·개발자·연구자를 위해.",
  heroSub1:
    "Sidecar는 작업 상태, 결정, 다음 할 일을 당신의 로컬 폴더에 저장합니다 — 컨텍스트를 처음부터 다시 쌓지 않고 긴 AI 작업을 이어갈 수 있게.",
  ctaOpen: "Sidecar 열기",
  ctaSeeHow: "어떻게 도움이 되는지 보기",
  trustShort:
    "계정 없음. 브라우저에서 동작. 저장 위치는 우리 서버가 아니라 당신의 폴더입니다.",
  introH2: "왜 긴 AI 작업은 점점 지치게 될까",
  introP1a: "대부분의 AI 도구는 대화를 보존합니다.",
  introP1b:
    "하지만 작업의 흐름, 사고의 구조, 프로젝트의 추진력, 다시 시작할 지점은 보존하지 못합니다.",
  introP2:
    "그래서 매번 돌아올 때마다 컨텍스트를 다시 쌓느라 에너지를 씁니다. 그 과정에서 재시작 피로, 혼란, 반복 설명, 흐름의 단절이 생깁니다.",
  introP3: "대화는 남아 있습니다. 그런데 프로젝트의 작업 상태는 남아 있지 않습니다.",
  problemLabel: "문제",
  howLabel: "Sidecar는 이렇게 돕습니다",
  ctaH2: "다음 AI 작업부터 한 번 써보세요.",
  ctaLead:
    "계정 만들 필요 없습니다. 브라우저에서 바로 동작합니다. 저장은 우리가 아니라 당신의 폴더에 됩니다.",
  ctaTrust:
    "당신의 AI 대화는 화면 밖으로 나가지 않습니다. Sidecar는 ChatGPT, Claude 그 어떤 것에도 연결되지 않습니다. 그저 당신이 흐름을 놓치지 않도록 도울 뿐입니다.",
  footer: "© {year} Sidecar. AI로 진짜 일하는 사람들을 위해.",
  whoLabel: "이런 분께",
  whoTitle: "여러 세션에 걸쳐 AI와 일하는 사람을 위해 만들었습니다.",
  whoItems: [
    "몇 분이 아니라 며칠, 몇 주 단위로 프로젝트를 끌고 가는 1인 빌더",
    "ChatGPT, Claude, Cursor로 작업을 이어가는 개발자",
    "길고 계속 바뀌는 맥락을 다루는 연구자·작가",
    "AI 작업을 다시 열 때마다 재시작 피로를 느끼는 사람",
  ],
  whenLabel: "이럴 때",
  whenTitle: "작업이 대화 하나로 끝나지 않을 때 꺼내 쓰세요.",
  whenItems: [
    "프로젝트가 한 세션을 넘길 때",
    "중요한 판단 근거가 긴 대화에 묻힐 때",
    "결정과 다음 할 일을 보존해야 할 때",
    "다시 시작하는 게 작업 자체보다 무겁게 느껴질 때",
  ],
  faqLabel: "자주 묻는 질문",
  faqTitle: "궁금한 점을 솔직하게 답합니다.",
  faqItems: [
    {
      q: "Sidecar가 제 ChatGPT나 Claude 계정에 연결되나요?",
      a: "아니요. Sidecar는 전적으로 브라우저에서 동작하며 ChatGPT, Claude 등 외부 AI API에 연결되지 않습니다. 중요한 내용은 직접 복사해 Sidecar에 담습니다.",
    },
    {
      q: "ChatGPT, Claude, Cursor와 같이 쓸 수 있나요?",
      a: "네. Sidecar는 어떤 AI 도구 옆에서도 함께 씁니다. 도구를 가리지 않습니다 — 복사할 수 있는 것이면 무엇이든 보존할 수 있습니다.",
    },
    {
      q: "제 대화를 당신들 서버에 저장하나요?",
      a: "아니요. 모든 것은 당신의 로컬 폴더에 저장됩니다. 계정도, 당신의 작업을 들고 있는 서버도 없습니다.",
    },
    {
      q: "코딩 전용인가요, 아니면 연구·글쓰기에도 쓰나요?",
      a: "긴 AI 작업이라면 무엇이든. Resume, Anchors, Snapshot은 코드뿐 아니라 연구, 글쓰기, 기획에도 똑같이 적용됩니다.",
    },
  ],
  sections: [
    {
      quote: "“잠깐… 우리가 뭐 하고 있었지?”",
      problemTitle:
        "AI와 몇 시간, 며칠 단위로 작업해 본 적이 있다면 익숙한 장면입니다.",
      problemBody: ["다시 돌아왔는데 갑자기:"],
      problemBullets: [
        "방향이 흐릿해진다",
        "다음에 뭘 해야 할지가 사라진다",
        "중요한 판단의 근거가 끊겨 보인다",
        "작업의 추진력이 사라진다",
      ],
      solveTitle: "Resume",
      solveLead:
        "Resume는 프로젝트의 현재 작업 상태를 구조화된 형식으로 저장합니다. 긴 대화를 다시 읽지 않아도 지금 어디까지 왔는지, 무엇이 중요한지, 다음에 뭘 할지를 곧바로 복구합니다.",
      example: {
        label: "예시",
        lines: [
          { k: "CURRENT", v: "랜딩 페이지 방향 확정" },
          { k: "NEXT", v: "온보딩 구조 다듬기" },
          { k: "ISSUE", v: "첫 방문자에게 더 명확한 설명 필요" },
        ],
      },
      closing:
        "단순한 메모가 아니라 복구 가능한 작업 상태입니다. 사용자도 AI도 같은 지점에서 다시 이어갑니다.",
    },
    {
      quote: "“분명 대화 어딘가에 있었는데.”",
      problemTitle:
        "AI 대화는 길어질수록 점점 다시 찾아보기 어려워집니다.",
      problemBody: [
        "중요한 아이디어와 결정들이 거대한 스레드 안에 묻혀버립니다.",
        "답이 있다는 건 압니다. 다만 다시 다 뒤지고 싶지 않을 뿐입니다.",
        "문제는 정보가 없는 게 아니라, 다시 꺼내는 게 피곤하다는 겁니다.",
      ],
      problemBullets: [
        "중요한 판단 근거가 긴 대화 속에 사라진다",
        "프로젝트의 결정이 맥락을 잃는다",
        "왜 이 방향을 택했는지 잊어버린다",
      ],
      solveTitle: "Anchors",
      solveLead:
        "Anchors는 중요한 결정과 그 이유를 함께 보존합니다. 결과물만이 아니라 왜 그 방향을 택했는지, 무엇을 계속 지켜야 하는지까지 남깁니다.",
      closing:
        "같은 판단을 반복해서 다시 찾아내는 대신, 결정의 흐름을 그대로 복원할 수 있습니다.",
    },
    {
      quote: "“같은 맥락을 또 쌓고 싶지 않아.”",
      problemTitle:
        "저장된 파일들은 시간이 지나면 대부분 해석하기 어려워집니다.",
      problemBody: [
        "프로젝트를 다시 열면 이 문서가 무엇이고, 어떤 역할을 하고, 작업 흐름과 어떻게 연결되는지를 떠올리는 데 에너지가 듭니다.",
        "사용자는 자주 이런 질문을 합니다:",
      ],
      problemBullets: [
        "이게 최신 버전인가?",
        "요약본인가, 작업 중인 문서인가?",
        "왜 이걸 저장했지?",
        "이게 프로젝트와 어떻게 연결되지?",
      ],
      solveTitle: "Metadata Headers",
      solveLead:
        "메타데이터 헤더는 사용자와 AI 모두에게 이 문서가 무엇이고, 왜 있고, 어디에 들어맞는지 한눈에 알려줍니다.",
      example: {
        label: "예시",
        lines: [
          { k: "kind", v: "resume" },
          { k: "summary", v: "현재 작업 상태" },
          { k: "keywords", v: "workflow, continuity, metadata" },
        ],
      },
      closing:
        "목표는 단순한 저장이 아닙니다. 복구 가능한 맥락을 남기는 것입니다.",
    },
    {
      quote: "“작업은 있는데, 흐름이 사라졌어.”",
      problemTitle:
        "다시 시작하는 일이 작업 자체보다 더 무겁게 느껴질 때가 있습니다.",
      problemBody: [
        "파일도 남고, 대화도 남고, 결과물도 남습니다. 그런데 프로젝트가 어디로 가고 있었는지의 감각은 자주 사라집니다.",
        "특히 긴 AI 협업에서는:",
      ],
      problemBullets: [
        "판단의 근거가 흐려진다",
        "우선순위가 바뀐다",
        "해결 못한 문제가 사라져버린다",
        "심리적 추진력이 사라진다",
      ],
      solveTitle: "Summary & Snapshot",
      solveLead:
        "Summary와 Snapshot은 중요한 순간의 작업 상태를 담습니다 — 무엇을 마쳤고, 무엇이 중요했고, 어디서부터 다시 이어갈지를.",
      closing:
        "그래서 멈춤이 단절이 아니라, 다시 이어갈 수 있는 정지가 됩니다.",
    },
    {
      quote: "“이 프로젝트 폴더, 드디어 이해가 되네.”",
      problemTitle:
        "대부분의 폴더는 파일만 저장합니다. 작업 흐름은 보존하지 못합니다.",
      problemBody: [
        "시간이 지나면 폴더는 살아 있는 시스템이 아니라 그냥 보관함이 됩니다.",
        "대화, 메모, 초안, 결과물은 쌓이는데 그것들을 묶어주던 실은 사라집니다.",
      ],
      solveTitle: "스스로 자기를 설명하는 폴더",
      solveLead:
        "Sidecar는 작업을 명확한 역할로 나눕니다 — 지금, 다음, 큰 변경 전에 지켜둘 것. 각 파일이 자기 메타데이터를 갖고 있어 폴더가 스스로 읽힙니다.",
      example: {
        label: "폴더",
        lines: [
          { k: "CURRENT", v: "지금 이 프로젝트의 상태" },
          { k: "NEXT", v: "다음에 해야 할 것" },
          { k: "SAFE", v: "큰 변경 전에 찍어둔 스냅샷" },
          { k: "ANCHORS", v: "지켜야 할 결정과 그 이유" },
        ],
      },
      closing:
        "파일들의 보관함이 아니라, 프로젝트의 살아 있는 지도가 됩니다.",
    },
  ],
};

const COPY: Record<Lang, Copy> = { en: EN, ko: KO };

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "ko";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "ko" || q === "en") return q;
    const saved = window.localStorage.getItem("sidecar.landing.lang");
    if (saved === "ko" || saved === "en") return saved;
    const nav = (navigator.language || "").toLowerCase();
    if (nav.startsWith("ko")) return "ko";
    return "en";
  } catch {
    return "ko";
  }
}

function useReveal(deps: unknown[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    nodes.forEach((n) => n.classList.remove("in"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function Divider() {
  return (
    <div className="my-20 flex justify-center" aria-hidden>
      <div className="h-px w-16 bg-slate-200" />
    </div>
  );
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="fixed right-4 top-4 z-50">
      <div
        role="group"
        aria-label="Language"
        className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white/90 text-xs font-medium shadow-sm backdrop-blur"
      >
        <button
          type="button"
          onClick={() => onChange("ko")}
          aria-pressed={lang === "ko"}
          className={
            "px-3 py-1.5 transition " +
            (lang === "ko"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900")
          }
        >
          한국어
        </button>
        <button
          type="button"
          onClick={() => onChange("en")}
          aria-pressed={lang === "en"}
          className={
            "px-3 py-1.5 transition " +
            (lang === "en"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900")
          }
        >
          EN
        </button>
      </div>
    </div>
  );
}

function Hero({ c }: { c: Copy }) {
  return (
    <header className="px-6 pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="reveal">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {c.badge}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
            {c.heroH1}
          </h1>
          <p className="mt-4 text-lg font-medium leading-relaxed text-slate-700 sm:text-xl">
            {c.heroTagline}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
            {c.heroSub1}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="/app/"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              {c.ctaOpen}
              <span aria-hidden>→</span>
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {c.ctaSeeHow}
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">{c.trustShort}</p>
        </div>
      </div>
    </header>
  );
}

function Intro({ c }: { c: Copy }) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl reveal">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {c.introH2}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
          {c.introP1a}
          <br />
          {c.introP1b}
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {c.introP2}
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-500">
          {c.introP3}
        </p>
      </div>
    </section>
  );
}

function SectionBlock({
  s,
  idx,
  c,
}: {
  s: Section;
  idx: number;
  c: Copy;
}) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl">
        <div className="reveal">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {String(idx + 1).padStart(2, "0")} — {s.problemHeading ?? c.problemLabel}
          </h2>
          <h3 className="mt-3 whitespace-pre-line text-2xl font-semibold text-slate-900 sm:text-3xl">
            {s.quote}
          </h3>
          <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-slate-600 sm:text-lg">
            {s.problemTitle}
          </p>
          {s.problemBody.map((p, i) => (
            <p key={i} className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-600">
              {p}
            </p>
          ))}
          {s.problemBullets && (
            <ul className="mt-4 space-y-2 text-base text-slate-600">
              {s.problemBullets.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="reveal mt-12 rounded-xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            {c.howLabel}
          </p>
          <h4 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
            {s.solveTitle}
          </h4>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            {s.solveLead}
          </p>

          {s.example && (
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
                {s.example.label}
              </div>
              <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed text-slate-700">
                <code className="font-mono">
                  {s.example.lines.map((l) => `${l.k}: ${l.v}`).join("\n")}
                </code>
              </pre>
            </div>
          )}

          {s.closing && (
            <p className="mt-6 text-sm leading-relaxed text-slate-600 italic">
              {s.closing}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ListSection({
  label,
  title,
  items,
}: {
  label: string;
  title: string;
  items: string[];
}) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl reveal">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
          {label}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h2>
        <ul className="mt-6 space-y-3">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-3 text-base leading-relaxed text-slate-600 sm:text-lg"
            >
              <span
                aria-hidden
                className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FAQ({ c }: { c: Copy }) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl reveal">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
          {c.faqLabel}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {c.faqTitle}
        </h2>
        <dl className="mt-8 space-y-6">
          {c.faqItems.map((item, i) => (
            <div
              key={i}
              className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0"
            >
              <dt className="text-base font-semibold text-slate-900">
                {item.q}
              </dt>
              <dd className="mt-2 text-base leading-relaxed text-slate-600">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function CTA({ c }: { c: Copy }) {
  return (
    <section className="px-6 pb-32">
      <div className="mx-auto max-w-3xl">
        <div className="reveal rounded-2xl border border-slate-200 bg-white p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {c.ctaH2}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {c.ctaLead}
          </p>

          <div className="mt-8">
            <a
              href="/app/"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              {c.ctaOpen}
              <span aria-hidden>→</span>
            </a>
          </div>

          <p className="mt-8 text-sm italic leading-relaxed text-slate-500">
            {c.ctaTrust}
          </p>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          {c.footer.replace("{year}", String(new Date().getFullYear()))}
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => detectInitialLang());
  const c = COPY[lang];
  const ref = useReveal([lang]);

  useEffect(() => {
    try {
      document.documentElement.lang = c.htmlLang;
      window.localStorage.setItem("sidecar.landing.lang", lang);
      const url = new URL(window.location.href);
      if (url.searchParams.get("lang") !== lang) {
        url.searchParams.set("lang", lang);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* no-op */
    }
  }, [lang, c.htmlLang]);

  const handleChange = useCallback((l: Lang) => setLang(l), []);

  return (
    <div ref={ref} className="min-h-screen bg-white">
      <LangToggle lang={lang} onChange={handleChange} />
      <Hero c={c} />
      <div id="how">
        <Intro c={c} />
        <Divider />
        <ListSection label={c.whoLabel} title={c.whoTitle} items={c.whoItems} />
        <Divider />
        <ListSection
          label={c.whenLabel}
          title={c.whenTitle}
          items={c.whenItems}
        />
        <Divider />
        {c.sections.map((s, i) => (
          <div key={i}>
            <SectionBlock s={s} idx={i} c={c} />
            {i < c.sections.length - 1 && <Divider />}
          </div>
        ))}
        <Divider />
        <FAQ c={c} />
        <Divider />
        <CTA c={c} />
      </div>
    </div>
  );
}
