# Project Guidelines

## Build and Run
- Instale dependências com npm install.
- Use npm run dev para desenvolvimento.
- Use npm run build para validação de produção.
- Use npm run start para executar build localmente.
- Hoje não existem scripts de lint/teste; se adicionar, atualize [package.json](package.json) e [README.md](README.md).

## Architecture
- Projeto em Next.js App Router.
- [app/layout.jsx](app/layout.jsx) define metadados, fontes e importa o CSS global.
- [app/page.jsx](app/page.jsx) mantém a rota raiz enxuta, renderizando o jogo.
- [components/SnakeGame.jsx](components/SnakeGame.jsx) concentra estado, loop de jogo, input e animações, e deve permanecer como Client Component.

## Code Style
- Preserve o padrão visual baseado em variáveis CSS e data-attributes em [app/globals.css](app/globals.css).
- Mantenha as posições dos elementos do board (cobra/comida/efeitos) via left/top absolutos no grid; trocar para transform x/y pode quebrar alinhamento visual.
- Mantenha a duração de transição da cobra sincronizada com a velocidade do jogo usando segmentTravelDuration em [components/SnakeGame.jsx](components/SnakeGame.jsx).

## Conventions
- Não remover a diretiva use client de [components/SnakeGame.jsx](components/SnakeGame.jsx#L1).
- Mantenha APIs de browser (window, document, localStorage) em efeitos/event handlers do Client Component e preserve guardas de ambiente (typeof window) antes de usar localStorage.
- Preserve refs que sustentam o loop (directionRef, queuedDirectionRef, foodRef, lastMoveRef); remover isso tende a reintroduzir stale closure no setInterval.
- Controles de teclado do jogo devem continuar chamando preventDefault para evitar scroll/interferência da página.
- Mantenha listener de teclado com passive: false para que preventDefault funcione corretamente.
- Preserve o comportamento de fullscreen baseado em data-fullscreen no shell.

## References
- Visão geral e comandos: [README.md](README.md)
- Ponto de entrada da UI: [app/page.jsx](app/page.jsx)
- Layout e estilos globais: [app/layout.jsx](app/layout.jsx), [app/globals.css](app/globals.css)
- Regras principais do jogo: [components/SnakeGame.jsx](components/SnakeGame.jsx)
