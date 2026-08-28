import { Button } from "@/components/ui/button";
import { useInterview } from "./store";

export function Landing() {
  const enterRoom = useInterview((s) => s.enterRoom);
  const resume = useInterview((s) => s.resume);
  const reset = useInterview((s) => s.reset);
  const hasSession = useInterview((s) => s.messages.length > 0);

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      <div className="pointer-events-none absolute inset-y-10 left-0 hidden w-10 border-r border-line md:block">
        <span className="absolute top-1/2 left-1/2 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium tracking-[0.28em] text-faint uppercase">
          Confidencial
        </span>
      </div>

      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-8 md:px-12 md:py-12">
        <header className="landing-stagger flex items-start justify-between gap-6 border-b border-fg pb-6">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-fg uppercase">BTA Aditivos</p>
            <p className="mt-1 text-sm text-muted">Xanxerê · Santa Catarina</p>
          </div>
          <p className="text-right text-sm text-muted tabular-nums">Agosto 2026</p>
        </header>

        <section className="landing-stagger flex flex-1 flex-col justify-center py-12 md:py-16">
          <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
            Processo seletivo · simulação de banca
          </p>
          <h1 className="mt-4 font-display text-[2.15rem] leading-[1.12] tracking-[-0.03em] text-fg md:text-[3.25rem]">
            Não é um quiz de RH.
            <span className="mt-2 block italic">É a conversa da cadeira.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
            Luciana Weber, Head de Gente e Cultura, entrevista para Gerente Geral
            de Operações. Ela já leu o currículo — Amtex, Ingredion, os números —
            e cobra o que o papel não prova. Recusa resposta vazia e no fim emite
            um parecer honesto.
          </p>

          <ul className="mt-10 grid gap-4 border-y border-line py-6 text-sm text-fg md:grid-cols-3">
            <li>
              <p className="font-medium">Com o CV na mesa</p>
              <p className="mt-1 text-muted">Ela cita o fato do papel e pede o mecanismo. Sem recapitular carreira.</p>
            </li>
            <li>
              <p className="font-medium">Sem xxxxx</p>
              <p className="mt-1 text-muted">Tecla repetida, slogan e resposta oca são recusados na hora.</p>
            </li>
            <li>
              <p className="font-medium">Com parecer</p>
              <p className="mt-1 text-muted">No fim, a banca diz se levaria você aos sócios e entrega um informe de treino.</p>
            </li>
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            {hasSession ? (
              <>
                <Button size="lg" onClick={resume}>
                  Retomar conversa
                </Button>
                <Button size="lg" variant="outline" onClick={() => { reset(); enterRoom(); }}>
                  Começar de novo
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={enterRoom}>
                Entrar na sala
              </Button>
            )}
          </div>
        </section>

        <footer className="border-t border-line pt-5 text-xs text-faint">
          Treino confidencial. Não é processo seletivo oficial da BTA Aditivos.
        </footer>
      </div>
    </main>
  );
}
