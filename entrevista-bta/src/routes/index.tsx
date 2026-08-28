import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

const InterviewGate = lazy(() =>
  import("@/components/interview/gate").then((m) => ({ default: m.InterviewGate })),
);

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Opening() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg">
      <p className="text-sm font-medium tracking-[0.2em] text-muted uppercase">BTA Aditivos</p>
    </main>
  );
}

function Home() {
  return (
    <ClientOnly fallback={<Opening />}>
      <Suspense fallback={<Opening />}>
        <InterviewGate />
      </Suspense>
    </ClientOnly>
  );
}
