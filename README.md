# 🐍 Snake AI Lab (Snake Motion)

Um jogo da cobrinha (Snake) moderno, fluido e inteligente construído com **Next.js**, **React** e **Framer Motion**. Além do modo de jogo clássico, este projeto conta com um **Laboratório de Evolução de IA** integrado com a **API do Google Gemini**, onde a máquina joga, morre, aprende e evolui a cada geração!

## ✨ Destaques

- **🧠 Treino de IA com Gemini:** Assista a uma IA heurística jogar sozinha. Quando ela morre, a telemetria é enviada para o Google Gemini, que atua como um "cientista de dados" e reprograma a "genética" da cobra (Atração por Comida, Prioridade de Espaço livre e Medo de Paredes) para a próxima geração.
- **💬 Terminal de Pensamentos:** Um terminal lateral que exibe os logs do sistema e o que o Gemini está a "pensar" em tempo real, justificando as suas escolhas evolutivas após cada morte.
- **🎨 Temas Dinâmicos:** Jogue em diferentes atmosferas visuais como *Neon Pulse*, *Sunset Bloom* e *Forest Mist*, com cores, brilhos e backgrounds que reagem ao jogo.
- **⚙️ Dificuldades Variadas:** Ajuste o tamanho do tabuleiro e a velocidade escolhendo entre *Fácil*, *Normal*, *Difícil* e *Insano*.
- **⚡ Animações Fluidas:** Movimentos suaves, explosões de partículas ao comer e efeitos visuais gerados com a biblioteca Framer Motion.
- **🎁 Power-ups e Obstáculos:** Geração procedural de obstáculos dinâmicos e power-ups temporários (bônus de pontos, encolhimento e intangibilidade).
- **📱 Responsivo e Acessível:** Suporte total para teclado (WASD / Setas) no desktop e botões de toque dedicados na interface para dispositivos móveis.

## 🧬 Como o Laboratório de Evolução Funciona?

O cérebro da nossa cobrinha toma decisões espaciais baseadas em três "pesos" matemáticos principais:
1. **Atração por Comida:** A prioridade dada a encurtar a distância até o alvo.
2. **Prioridade de Espaço:** A capacidade de evitar becos sem saída (calculado via *Flood Fill*).
3. **Medo da Parede:** A repulsa por colar nas bordas do tabuleiro.

**O Ciclo de Treino:**
1. A IA pode começar com instintos terríveis (ex: atração mortal pelas paredes).
2. Ela inevitavelmente falha (bate na parede, no próprio corpo ou num obstáculo).
3. O jogo pausa e envia um relatório para a API do Gemini com o prompt: *"A cobra morreu batendo na parede. Estes eram os pesos dela. Analise o erro e ajuste a genética."*
4. O Gemini devolve (via Structured Outputs em JSON) novos pesos otimizados e um **"pensamento"** explicando a sua lógica evolutiva.
5. A IA renasce na próxima geração, visivelmente mais inteligente e adaptada!

*(Nota: Caso a API atinja o limite de requisições gratuitas (Rate Limit), um sistema inteligente de Cooldown entra em ação e mutações matemáticas locais assumem o controle temporariamente para que a evolução nunca pare!)*

## 🛠️ Tecnologias Utilizadas

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [Framer Motion](https://www.framer.com/motion/) (Animações complexas de UI)
- [Google Gemini API](https://ai.google.dev/) (Integração de LLM para lógica evolutiva)
- Estilização nativa com CSS Variables

## 🚀 Rode localmente!

Siga os passos abaixo para rodar o projeto na sua máquina:

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/davipgouveia/Snake-Game.git](https://github.com/davipgouveia/Snake-Game.git)
   cd Snake-Game
2. **Instale as dependências:**
   ```bash
    npm install
3. **Configure a Chave da API (Necessário para a Evolução IA):**
Crie um arquivo .env.local na raiz do projeto e adicione a sua chave da API do Google Gemini (você pode gerar uma gratuitamente no Google AI Studio):
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=sua_chave_api_aqui
4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
5. **Acesse no navegador:**
Abra http://localhost:3000 e divirta-se!

## 🌐 Acesse pelo meu site!
Link: https://snake-game-three-kappa-71.vercel.app/
