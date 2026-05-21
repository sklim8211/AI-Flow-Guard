import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Sidecar } from "@/components/Sidecar";

const queryClient = new QueryClient();

function Home() {
  const isSidePanel = window.innerWidth <= 440;
  if (isSidePanel) {
    return <div className="min-h-[100dvh] w-full bg-white" />;
  }
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 text-slate-400 selection:bg-slate-200">
      <div className="text-center opacity-60">
        <h1 className="text-sm font-medium tracking-wide uppercase text-slate-400">Quiet Question Sidecar</h1>
        <p className="mt-2 text-xs">오른쪽 패널에서 프롬프트를 선택하세요.</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode for the premium quiet aesthetic
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <Sidecar />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
