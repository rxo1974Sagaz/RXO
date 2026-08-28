# Entrevista executiva BTA Aditivos

Simulador de banca para **Gerente Geral de Operações** na BTA Aditivos (Xanxerê/SC).

A entrevistadora é **Luciana Weber** (Head de Gente e Cultura). Ela já leu o currículo de Ricardo Xavier de Oliveira (Amtex Medellín, Ingredion, números de OEE/NC/custo), recusa resposta vazia, puxa o fio da fala anterior e, ao final, emite parecer + informe de treino (~1.000 palavras).

Este diretório guarda o **código-fonte da simulação**. Não substitui o site público em [rxobr.com](https://rxobr.com) (raiz deste repositório).

## O que tem aqui

```
src/components/interview/   sala, caderno, compositor, informe, store
src/lib/interview/          prompt da Luciana, CV, API, qualidade, encerramento
src/components/ui/          botão e textarea
src/routes/index.tsx        rota da sala (só no cliente)
```

A conversa roda no navegador (Zustand + persistência local). Cada fala vai a um server function que chama o modelo com o dossiê da BTA e o CV.

## Como a banca se comporta

- Fundo branco, letras pretas.
- Recusa `xxxxx`, teclado smash e slogan.
- Não pede para recapitular o currículo — cita o fato do papel e cobra o mecanismo.
- Não encerra cedo: só após ~10 falas substantivas (ou se o candidato pedir).
- Se a API demorar, a sala **destrava** e deixa tentar de novo. A ata não some.

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `src/lib/interview/prompt.server.ts` | Persona da Luciana + regras da conversa |
| `src/lib/interview/cv.server.ts` | Currículo RXO lido pela banca |
| `src/lib/interview/api.ts` | Turno + informe |
| `src/lib/interview/close.ts` | Trava de encerramento precoce |
| `src/lib/interview/quality.ts` | Detector de resposta vazia |
| `src/components/interview/store.ts` | Estado, persistência, watchdog |
| `src/components/interview/informe.tsx` | Informe de treino ao final |

## Aviso

Treino confidencial. **Não é processo seletivo oficial da BTA Aditivos.**
