const OPENERS = [
  "Ricardo, bom dia. Luciana Weber, Gente e Cultura da BTA. Li o currículo — não vou te pedir para repetir a Amtex nem a Ingredion. Diretoria em Medellín, reportando ao CEO regional, 1.500 toneladas por mês. O que nesta cadeira de Xanxerê te tira de lá agora?",
  "Ricardo. Luciana, da BTA. Pasta lida. OEE de 75 para 88, não conformidade de 5,4 para 1,2, custo fixo caindo enquanto a receita sobe. Antes de qualquer indicador: o juízo. Por que Gerente Geral de Operações numa especialidade química no Oeste catarinense, e não mais um ciclo de polímero na Colômbia?",
  "Bom dia, Ricardo. Luciana Weber. A vaga nasceu de um momento específico — crescimento, planta reconstruída, sistema operacional atrasado em relação ao comercial. Li os 28 anos de Ingredion e o salto na Amtex. Em duas frases, sem o LinkedIn: que problema você acha que esta posição precisa resolver?",
  "Ricardo, prazer. Luciana, Gente. Pode ir direto. Não quero o currículo — já está na mesa. Quero o ponto em que a diretoria de manufatura em Medellín deixa de ser o melhor uso da sua carreira. O que é isso, agora?",
];

export function pickOpener(): string {
  const index = Math.floor(Math.random() * OPENERS.length);
  return OPENERS[index] ?? OPENERS[0]!;
}
