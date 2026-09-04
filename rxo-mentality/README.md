# RXO Mentality

Aplicação estática da persona intelectual RXO Mentality. Foi projetada para rodar integralmente no navegador e ser publicada no GitHub Pages em:

`https://rxobr.com/rxo-mentality/`

## Arquitetura

- Interface: HTML, CSS e JavaScript sem etapa de build.
- Inferência: [WebLLM 0.2.84](https://github.com/mlc-ai/web-llm) com WebGPU e Web Worker.
- Modelos disponíveis: Qwen2.5 0.5B e 1.5B, quantizados para execução no navegador.
- Memória: `localStorage` do próprio dispositivo.
- Conhecimento: base editorial compacta em `knowledge.js`.
- Backend: nenhum.
- Chaves de API: nenhuma.

## Privacidade e publicação

Os documentos originais usados como referência não fazem parte do repositório. A base pública contém somente uma síntese editorial de princípios, posições e experiência profissional, sem telefone, e-mail ou cópias integrais das obras.

As conversas permanecem no navegador do visitante. O carregamento do modelo e das bibliotecas depende dos serviços públicos indicados pelo WebLLM; após o primeiro carregamento, os pesos podem permanecer no cache do navegador.

## Limitações assumidas

GitHub Pages entrega apenas arquivos estáticos. Por isso, esta versão:

- não consulta a internet;
- não verifica fatos atuais;
- depende de navegador e dispositivo com WebGPU;
- baixa aproximadamente 1 GB no modelo leve ou demanda cerca de 2,7 GB de memória gráfica no modelo equilibrado;
- usa modelos pequenos, menos capazes que serviços de IA hospedados em nuvem.

Essas limitações são exibidas ao usuário na interface. Nenhuma chave secreta é colocada no código cliente.

## Desenvolvimento local

Use um servidor HTTP local. Abrir `index.html` diretamente pelo sistema de arquivos não oferece o contexto seguro exigido pelo WebGPU.

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080/rxo-mentality/`. O suporte a WebGPU em `localhost` depende do navegador.

## Estrutura

```text
rxo-mentality/
├── index.html       # estrutura e conteúdo da interface
├── styles.css       # identidade visual RXO
├── app.js           # chat, memória, recuperação e inferência
├── knowledge.js     # persona e base editorial pública
├── worker.js        # execução do WebLLM fora da interface
├── logo.svg         # marca vetorial local
└── README.md        # documentação técnica
```

## Critérios para evolução

Se futuramente houver autorização para um backend serverless, a interface pode manter o mesmo desenho e substituir o motor WebLLM por uma API mais competente. A chave deverá permanecer no servidor, nunca no JavaScript público.
