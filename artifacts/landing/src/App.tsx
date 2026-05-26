import { useEffect, useRef } from "react";
import "./index.css";

type Section = {
  quote: string;
  problemTitle: string;
  problemBody: string[];
  problemBullets?: string[];
  solveTitle: string;
  solveLead: string;
  solveBullets?: string[];
  example?: { label: string; lines: { k: string; v: string }[] };
  closing?: string;
};

const SECTIONS: Section[] = [
  {
    quote: "“Wait… what were we doing again?”",
    problemTitle: "If you work with AI for hours or days, this probably feels familiar.",
    problemBody: [
      "You come back later and suddenly:",
    ],
    problemBullets: [
      "the direction feels unclear",
      "the next step is missing",
      "important reasoning feels disconnected",
      "the workflow momentum is gone",
    ],
    solveTitle: "Resume",
    solveLead:
      "Resume saves the current working state of the project in a structured format. Instead of rereading long chats, you can quickly restore where the project currently is, what matters right now, what should happen next, and what problems still remain.",
    example: {
      label: "Example",
      lines: [
        { k: "CURRENT", v: "Landing page direction finalized" },
        { k: "NEXT", v: "Refine onboarding structure" },
        { k: "ISSUE", v: "Need clearer explanation for first-time users" },
      ],
    },
    closing:
      "Resume is not just a note. It is a recoverable workflow state. It helps both you and AI continue from the same point later.",
  },
  {
    quote: "“I know it's somewhere in the chat.”",
    problemTitle: "Long AI conversations become difficult to navigate over time.",
    problemBody: [
      "Important ideas and decisions get buried inside large threads.",
      "You know the answer exists. You just don't want to dig through everything again.",
      "The issue is not missing information. The issue is retrieval fatigue.",
    ],
    problemBullets: [
      "important reasoning disappears inside long conversations",
      "project decisions lose context",
      "users forget why certain directions were chosen",
    ],
    solveTitle: "Anchors",
    solveLead:
      "Anchors preserve important decisions and the reasoning behind them. Instead of only saving outputs, Anchors save why a decision was made, what direction was chosen, and what should remain consistent moving forward.",
    closing:
      "Instead of rediscovering the same reasoning again and again, users can restore the decision path directly.",
  },
  {
    quote: "“I don't want to rebuild context again.”",
    problemTitle: "Most stored files eventually become difficult to interpret.",
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
      "Metadata Headers help both users and AI immediately understand the role of a document.",
    example: {
      label: "Example",
      lines: [
        { k: "kind", v: "resume" },
        { k: "summary", v: "current workflow state" },
        { k: "keywords", v: "workflow, continuity, metadata" },
      ],
    },
    closing:
      "The goal is not just storage. The goal is recoverable context.",
  },
  {
    quote: "“The work exists. But the momentum is gone.”",
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
      "Summary and Snapshot preserve the state of the workflow at important moments. They capture what was completed, what mattered, what should happen next, and where work should resume later.",
    closing:
      "This turns stopping into a recoverable pause instead of a hard interruption.",
  },
  {
    quote: "“Why does this project folder finally feel understandable?”",
    problemTitle: "Most folders only store files. They do not preserve workflow.",
    problemBody: [
      "Over time, folders become archives instead of working systems.",
      "Users accumulate chats, notes, drafts, and outputs — but lose the thread that ties them together.",
    ],
    solveTitle: "A folder that knows what it holds",
    solveLead:
      "Sidecar organizes work into clear roles: what you are doing now, what should happen next, and what must stay safe before a big change. Each file already carries its own metadata, so the folder reads itself.",
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
];

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
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
  }, []);
  return ref;
}

function Divider() {
  return (
    <div className="my-20 flex justify-center" aria-hidden>
      <div className="h-px w-16 bg-slate-200" />
    </div>
  );
}

function Hero() {
  return (
    <header className="px-6 pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="reveal">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sidecar — a quiet workspace next to your AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.1]">
            Never lose your place in AI work again.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
            A quiet sidecar that remembers what your AI conversation forgets.
          </p>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Sidecar helps you continue long AI work without rebuilding context from scratch.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Open Sidecar
              <span aria-hidden>→</span>
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              See how it helps
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No account. Runs in your browser. Saves to your folder, not ours.
          </p>
        </div>
      </div>
    </header>
  );
}

function Intro() {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl reveal">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Why long AI work becomes exhausting
        </h2>
        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
          Most AI tools preserve conversations.
          <br />
          But they do not preserve workflow continuity, reasoning structure, project
          momentum, or restart position.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          So every time you return, you spend energy reconstructing context again.
          That creates restart fatigue, confusion, repeated explanations, and broken
          momentum.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-500">
          The conversation still exists. But the working state of the project does not.
        </p>
      </div>
    </section>
  );
}

function SectionBlock({ s, idx }: { s: Section; idx: number }) {
  return (
    <section className="px-6">
      <div className="mx-auto max-w-3xl">
        <div className="reveal">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {String(idx + 1).padStart(2, "0")} — Problem
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {s.quote}
          </h3>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            {s.problemTitle}
          </p>
          {s.problemBody.map((p, i) => (
            <p key={i} className="mt-4 text-base leading-relaxed text-slate-600">
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
            How Sidecar helps
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
                  {s.example.lines
                    .map((l) => `${l.k}: ${l.v}`)
                    .join("\n")}
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

function CTA() {
  return (
    <section className="px-6 pb-32">
      <div className="mx-auto max-w-3xl">
        <div className="reveal rounded-2xl border border-slate-200 bg-white p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Try Sidecar quietly.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            No account needed. Runs in your browser. Saves to your folder, not ours.
          </p>

          <div className="mt-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Open Sidecar
              <span aria-hidden>→</span>
            </a>
          </div>

          <p className="mt-8 text-sm italic leading-relaxed text-slate-500">
            Your AI conversations never leave your screen. Sidecar doesn't connect to
            ChatGPT, Claude, or anything else. It just helps you keep track.
          </p>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Sidecar. Made for people who work with AI for real.
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const ref = useReveal();
  return (
    <div ref={ref} className="min-h-screen bg-white">
      <Hero />
      <div id="how">
        <Intro />
        <Divider />
        {SECTIONS.map((s, i) => (
          <div key={i}>
            <SectionBlock s={s} idx={i} />
            {i < SECTIONS.length - 1 && <Divider />}
          </div>
        ))}
        <Divider />
        <CTA />
      </div>
    </div>
  );
}
