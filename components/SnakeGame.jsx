"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const DIFFICULTIES = [
  { id: 'easy', label: 'Fácil', size: 12, speed: 180, score: 10, note: 'Ritmo leve para aquecer.' },
  { id: 'normal', label: 'Normal', size: 16, speed: 130, score: 20, note: 'Boa cadência para partidas longas.' },
  { id: 'hard', label: 'Difícil', size: 20, speed: 90, score: 30, note: 'Mais rápido e apertado.' },
  { id: 'nightmare', label: 'Insano', size: 24, speed: 60, score: 40, note: 'Para reflexos curtos e precisos.' },
];

const THEMES = [
  {
    id: 'neon',
    label: 'Neon Pulse',
    accent: '#6cf7d6',
    accentStrong: '#28c9ff',
    board: 'linear-gradient(145deg, rgba(8, 19, 30, 0.98), rgba(14, 28, 50, 0.98))',
    snakeHead: '#d5fff7',
    snakeBody: '#5ef0cf',
    food: '#ff6b8a',
    glow: '#6cf7d6',
    description: 'Brilho frio com contraste alto.',
  },
  {
    id: 'sunset',
    label: 'Sunset Bloom',
    accent: '#ffd36c',
    accentStrong: '#ff8f5f',
    board: 'linear-gradient(145deg, rgba(37, 18, 40, 0.98), rgba(70, 26, 47, 0.98))',
    snakeHead: '#fff2ce',
    snakeBody: '#ffba6f',
    food: '#ff6f91',
    glow: '#ffb26c',
    description: 'Quente, saturado e elegante.',
  },
  {
    id: 'forest',
    label: 'Forest Mist',
    accent: '#97f27d',
    accentStrong: '#43d9a3',
    board: 'linear-gradient(145deg, rgba(10, 32, 26, 0.98), rgba(11, 48, 38, 0.98))',
    snakeHead: '#e6ffe0',
    snakeBody: '#85f29e',
    food: '#ffd86d',
    glow: '#97f27d',
    description: 'Mais orgânico e suave.',
  },
];

const INITIAL_DIRECTION = { x: 1, y: 0 };
const DEBUG_SNAKE = process.env.NODE_ENV !== 'production';

function debugSnake(event, payload) {
  if (!DEBUG_SNAKE) return;
  console.log(`[snake-debug] ${event}`, payload);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function createSnake(boardSize) {
  const center = Math.floor(boardSize / 2);
  return [{ x: center, y: center }];
}

function isSameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isCornerCell(boardSize, position) {
  const max = boardSize - 1;
  return (
    (position.x === 0 && position.y === 0) ||
    (position.x === max && position.y === 0) ||
    (position.x === 0 && position.y === max) ||
    (position.x === max && position.y === max)
  );
}

function oppositeDirection(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

// --- CÉREBRO DA IA COM PENSAMENTOS ---
function calculateWeightedMove(head, food, snake, obstacles, boardSize, lastMove, weights) {
  const possibleMoves = [
    DIRECTIONS.ArrowUp, DIRECTIONS.ArrowDown,
    DIRECTIONS.ArrowLeft, DIRECTIONS.ArrowRight,
  ];

  const isSafe = (x, y) => {
    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return false;
    if (obstacles.some(obs => obs.x === x && obs.y === y)) return false;
    const body = snake.slice(0, snake.length - 1);
    if (body.some(segment => segment.x === x && segment.y === y)) return false;
    return true;
  };

  const countFreeSpace = (startX, startY, limit = 50) => {
    let queue = [{ x: startX, y: startY }];
    let visited = new Set([`${startX},${startY}`]);
    let count = 0;

    while (queue.length > 0 && count < limit) {
      const current = queue.shift();
      count++;

      for (const move of possibleMoves) {
        const nx = current.x + move.x;
        const ny = current.y + move.y;
        const key = `${nx},${ny}`;
        if (isSafe(nx, ny) && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return count;
  };

  let bestMove = null;
  let highestScore = -Infinity;
  let currentThought = "A processar...";

  for (const move of possibleMoves) {
    if (oppositeDirection(lastMove, move)) continue;

    const nextX = head.x + move.x;
    const nextY = head.y + move.y;

    const safe = isSafe(nextX, nextY);

    const isWallCrash = (nextX < 0 || nextX >= boardSize || nextY < 0 || nextY >= boardSize) ? 1 : 0;
    const isSelfCrash = (!safe && !isWallCrash) ? 1 : 0;

    const distToFood = Math.abs(nextX - food.x) + Math.abs(nextY - food.y);
    const freeSpace = safe ? countFreeSpace(nextX, nextY, boardSize * 3) : 0;

    let score = 0;

    // 1. Atração por Comida
    score += (100 / (distToFood + 1)) * weights.foodAttraction;

    // 2. Cálculo de Espaço e Auto-preservação
    if (isSelfCrash) {
      score -= 1000 * weights.spacePriority;
    } else {
      score += freeSpace * weights.spacePriority;
    }

    // 3. Cálculo de Bordas e Paredes
    if (isWallCrash) {
      score -= 1000 * weights.edgeAvoidance;
    } else {
      const huggingWall = (nextX === 0 || nextX === boardSize - 1 || nextY === 0 || nextY === boardSize - 1) ? 1 : 0;
      score -= huggingWall * weights.edgeAvoidance;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMove = move;

      // Gerar pensamento baseado na decisão atual
      if (isWallCrash && weights.edgeAvoidance > 0) {
        currentThought = "PÂNICO: Evitando a parede!";
      } else if (isWallCrash && weights.edgeAvoidance < 0) {
        currentThought = "ATRAÇÃO FATAL: Direto para a parede!";
      } else if (distToFood < 4 && weights.foodAttraction > 2) {
        currentThought = `Foco: Comida (Dist: ${distToFood})`;
      } else if (freeSpace < boardSize * 1.5 && weights.spacePriority > 0) {
        currentThought = "Foco: Espaço apertado. A fugir!";
      } else {
        currentThought = "A explorar...";
      }
    }
  }

  return { move: bestMove, thought: currentThought };
}
// --------------------------------------------------------

function createFood(boardSize, snake) {
  let position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
  let attempts = 0;

  while (
    attempts < boardSize * boardSize * 2 &&
    (snake.some((segment) => isSameCell(segment, position)) || isCornerCell(boardSize, position))
  ) {
    position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
    attempts += 1;
  }
  return position;
}

function directionFromKey(code) {
  return DIRECTIONS[code] ?? null;
}

function ArrowIcon({ direction }) {
  const rotation =
    direction === 'up' ? 0 : direction === 'right' ? 90 : direction === 'down' ? 180 : 270;

  return (
    <svg className="icon-arrow" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M12 3l7 9h-4v9H9v-9H5l7-9z" fill="currentColor" />
    </svg>
  );
}

function SnakeSegmentSvg({ isHead, fill, direction, isEating }) {
  const headRotation =
    direction.x === 1 && direction.y === 0 ? 90 : direction.x === -1 && direction.y === 0 ? 270
      : direction.x === 0 && direction.y === 1 ? 180 : 0;

  if (!isHead) {
    return (
      <svg className="snake-svg" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="10" y="10" width="80" height="80" rx="22" fill={fill} />
        <rect x="10" y="10" width="80" height="80" rx="22" fill="rgba(255,255,255,0.16)" />
      </svg>
    );
  }

  return (
    <svg className="snake-svg" viewBox="0 0 100 100" aria-hidden="true">
      <g transform={`rotate(${headRotation} 50 50)`}>
        <rect x="8" y="8" width="84" height="84" rx="30" fill={fill} />
        <rect x="8" y="8" width="84" height="84" rx="30" fill="rgba(255,255,255,0.18)" />
        <circle cx="36" cy="34" r="6" fill="#040a12" />
        <circle cx="64" cy="34" r="6" fill="#040a12" />
        <circle cx="34" cy="32" r="2" fill="#ffffff" fillOpacity="0.9" />
        <circle cx="62" cy="32" r="2" fill="#ffffff" fillOpacity="0.9" />
        <circle cx="28" cy="53" r="5" fill="#ff8ca4" fillOpacity="0.35" />
        <circle cx="72" cy="53" r="5" fill="#ff8ca4" fillOpacity="0.35" />
        {isEating ? (
          <path d="M34 58c4 11 28 11 32 0" stroke="#0c1118" strokeWidth="6" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M36 58c3 8 25 8 28 0" stroke="#0c1118" strokeWidth="5" strokeLinecap="round" fill="none" />
        )}
      </g>
    </svg>
  );
}

function FoodSvg({ fill }) {
  return (
    <svg className="food-svg" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M53 18c7 0 12 5 12 12v5h-8v-5c0-2-2-4-4-4h-1c-2 0-4 2-4 4v5h-8v-5c0-7 5-12 12-12h1z" fill="#4db36c" />
      <path d="M50 30c18 0 33 15 33 33S68 96 50 96 17 81 17 63s15-33 33-33z" fill={fill} />
      <path d="M50 30c18 0 33 15 33 33S68 96 50 96 17 81 17 63s15-33 33-33z" fill="rgba(255,255,255,0.16)" />
      <ellipse cx="41" cy="52" rx="9" ry="6" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

export default function SnakeGame() {
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);

  const defaultDumbWeights = {
    foodAttraction: 0.1,
    spacePriority: 0.0,
    edgeAvoidance: -50.0    // IA Suicida (Procura a parede)
  };

  const [generation, setGeneration] = useState(1);
  const [aiWeights, setAiWeights] = useState(defaultDumbWeights);
  const aiWeightsRef = useRef(aiWeights);

  // --- ESTADOS DO TERMINAL ---
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalEndRef = useRef(null);
  const lastThoughtRef = useRef('');

  const addLog = (msg, type = 'system') => {
    setTerminalLogs(prev => {
      const newLogs = [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString([], { hour12: false }) }];
      return newLogs.slice(-30); // Mantém apenas os últimos 30 logs para não pesar a RAM
    });
  };

  //useEffect(() => {
  //    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  //}, [terminalLogs]);
  // --------------------------

  const [difficultyId, setDifficultyId] = useState('normal');
  const [themeId, setThemeId] = useState('neon');

  const [snake, setSnake] = useState([]);
  const snakeRef = useRef([]);
  const [obstacles, setObstacles] = useState([]);
  const obstaclesRef = useRef([]);

  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState(null);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState('ready');
  const statusRef = useRef('ready');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lastMove, setLastMove] = useState({ x: 1, y: 0 });
  const [foodSpawnId, setFoodSpawnId] = useState(0);
  const [eatUntilMs, setEatUntilMs] = useState(0);
  const [eatEffect, setEatEffect] = useState(null);
  const [crashType, setCrashType] = useState('none');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const shellRef = useRef(null);
  const segmentIdRef = useRef(0);
  const directionRef = useRef(INITIAL_DIRECTION);
  const queuedDirectionRef = useRef(null);
  const foodRef = useRef({ x: 0, y: 0 });
  const lastMoveRef = useRef(INITIAL_DIRECTION);
  const growthRef = useRef(0);
  const lifetimeTicksRef = useRef(0);

  const difficulty = useMemo(
    () => DIFFICULTIES.find((item) => item.id === difficultyId) ?? DIFFICULTIES[1],
    [difficultyId],
  );

  const theme = useMemo(
    () => THEMES.find((item) => item.id === themeId) ?? THEMES[0],
    [themeId],
  );

  const boardSize = difficulty.size;
  const segmentTravelDuration = useMemo(() => Math.max(0.06, (difficulty.speed / 1000) * 0.85), [difficulty.speed]);
  const isEating = eatUntilMs > Date.now();

  function getNextSegmentId() {
    segmentIdRef.current += 1;
    return segmentIdRef.current;
  }

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { aiWeightsRef.current = aiWeights; }, [aiWeights]);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const savedBest = Number(window.localStorage.getItem('snake-best-score') ?? 0);
    if (Number.isFinite(savedBest)) setBestScore(savedBest);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('snake-best-score', String(bestScore));
  }, [bestScore]);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { queuedDirectionRef.current = queuedDirection; }, [queuedDirection]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { lastMoveRef.current = lastMove; }, [lastMove]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    resetGame(boardSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault();
      }

      if (event.code === 'Space') {
        togglePause();
        return;
      }

      if (event.code === 'Enter') {
        if (status === 'gameover' || status === 'victory') {
          resetGame(boardSize);
          startGame();
        } else if (status === 'ready') {
          startGame();
        }
        return;
      }

      const next = directionFromKey(event.code);
      if (next) handleDirection(next);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardSize, status]);

  useEffect(() => {
    if (status !== 'running') return;
    let lastTime = performance.now();
    let acc = 0;
    let frameId;
    const tickInterval = difficulty.speed;

    function gameLoop(now) {
      const dt = now - lastTime;
      lastTime = now;
      acc += dt;
      while (acc >= tickInterval) {
        acc -= tickInterval;
        runGameTick();
      }
      frameId = requestAnimationFrame(gameLoop);
    }
    frameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line
  }, [status, boardSize, difficulty.speed, difficulty.score]);

  // --- CONSULTOR GEMINI COM GESTÃO DE TRÁFEGO ---
  async function askGeminiForEvolution(deathReason, length, ticks) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      addLog("Chave API ausente. Mutação aleatória.", "error");
      setTimeout(() => {
        const newW = {
          foodAttraction: Math.random() * 20,
          spacePriority: Math.random() * 10,
          edgeAvoidance: Math.random() * 5
        };
        setAiWeights(newW);
        setGeneration(g => g + 1);
        resetGame(boardSize);
        startGame();
      }, 2000);
      return;
    }

    addLog(`[Morto] Colisão: ${deathReason}. Tam: ${length}`, "error");
    addLog("A analisar com Gemini...", "system");

    const prompt = `
    Você é um cientista de dados treinando uma Inteligência Artificial para o jogo Snake.
    O agente da Geração ${generation} falhou e a partida terminou.
    Motivo da falha: Colidiu com ${deathReason === 'self' ? 'o próprio corpo' : deathReason === 'wall' ? 'a parede' : 'um obstáculo'}.
    Tamanho alcançado: ${length} blocos.
    Tempo de vida: ${ticks} passos.
    
    Os pesos atuais da IA são:
    - foodAttraction (Atração por comida): ${aiWeightsRef.current.foodAttraction}
    - spacePriority (Prioridade de espaço livre): ${aiWeightsRef.current.spacePriority}
    - edgeAvoidance (Evitar as bordas): ${aiWeightsRef.current.edgeAvoidance}
    
    Analise a causa da falha e os pesos atuais. 
    Se a cobra colidiu consigo mesma (self), precisa de mais spacePriority.
    Se a cobra colidiu com a parede (wall), precisa de mais edgeAvoidance.
    Se ficou muito pequena por muito tempo, precisa de mais foodAttraction.

    Retorne APENAS um objeto JSON válido (sem markdown, sem crases, apenas o JSON puro) com os novos pesos ajustados (pode usar números decimais).
    Exemplo do formato exato:
    { "foodAttraction": 12.5, "spacePriority": 5.0, "edgeAvoidance": 2.2 }
    `;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey 
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `${response.status}`);
      }
      
      if (data.promptFeedback?.blockReason) throw new Error("Bloqueio de segurança.");
      if (data.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("Bloqueio de segurança na resposta.");
      if (!data.candidates || data.candidates.length === 0) throw new Error("Sem resposta da API.");

      const text = data.candidates[0].content.parts[0].text;
      const newWeights = JSON.parse(text);

      if (typeof newWeights.foodAttraction !== 'number' || typeof newWeights.edgeAvoidance !== 'number') {
        throw new Error("JSON mal formatado.");
      }

      addLog(`[Gen ${generation} Evoluiu] C:${newWeights.foodAttraction.toFixed(1)} | E:${newWeights.spacePriority.toFixed(1)} | P:${newWeights.edgeAvoidance.toFixed(1)}`, "success");

      setTimeout(() => {
        setAiWeights(newWeights);
        setGeneration(g => g + 1);
        resetGame(boardSize);
        startGame();
      }, 2000);

    } catch (error) {
      console.error("[API Error]:", error);
      
      // SISTEMA DE GESTÃO DE LIMITES DE API
      const errorMessage = error.message;
      let delay = 3000; // Tempo normal de reinício se for erro simples
      
      if (errorMessage.includes('429')) {
        addLog("API Limitada (15 req/min). Em cooldown de 15s...", "error");
        delay = 15000;
      } else if (errorMessage.includes('503')) {
        addLog("Google sobrecarregado. Em cooldown de 10s...", "error");
        delay = 10000;
      } else {
        addLog(`Erro API: ${errorMessage}. Mutaçao local ativada...`, "error");
      }

      setTimeout(() => {
        // Mutação local baseada nos pesos atuais, para não perder o progresso
        setAiWeights(prev => ({
          foodAttraction: Math.max(0.1, prev.foodAttraction + (Math.random() * 4 - 1)),
          spacePriority: Math.max(0, prev.spacePriority + (Math.random() * 2 - 0.5)),
          edgeAvoidance: prev.edgeAvoidance + (Math.random() * 10 - 2) // Aumenta agressivamente para curar a tendência suicida
        }));
        setGeneration(g => g + 1);
        resetGame(boardSize);
        startGame();
      }, delay);
    }
  }
  // --- FIM askGeminiForEvolution ---

  function runGameTick() {
    // 1. TRAVÃO INSTANTÂNEO: Se já não estiver a correr, não processa mais nada!
    if (statusRef.current !== 'running') return;

    const currentSnake = snakeRef.current;
    if (currentSnake.length === 0) return;

    lifetimeTicksRef.current += 1;
    let nextDirection = queuedDirectionRef.current ?? directionRef.current;

    // --- IA AGENTE JOGANDO ---
    if (autoPlayRef.current) {
      const aiResult = calculateWeightedMove(
        currentSnake[0], foodRef.current, currentSnake, obstaclesRef.current, boardSize, lastMoveRef.current, aiWeightsRef.current
      );

      if (aiResult.move) {
        nextDirection = aiResult.move;
        setQueuedDirection(null);
        queuedDirectionRef.current = null;
        
        if (aiResult.thought !== lastThoughtRef.current && aiResult.thought !== "A explorar...") {
          lastThoughtRef.current = aiResult.thought;
        }
      }
    }

    // Impede a cobra de dar marcha-atrás
    if (oppositeDirection(lastMoveRef.current, nextDirection)) {
      nextDirection = directionRef.current;
      setQueuedDirection(null);
      queuedDirectionRef.current = null;
    }

    // Calcula a próxima posição da cabeça
    const head = currentSnake[0];
    const nextHead = { id: getNextSegmentId(), x: head.x + nextDirection.x, y: head.y + nextDirection.y };

    // --- DEFINIÇÃO DAS COLISÕES (Isto é o que estava a faltar!) ---
    const hitWall = nextHead.x < 0 || nextHead.x >= boardSize || nextHead.y < 0 || nextHead.y >= boardSize;
    const hitObstacle = obstaclesRef.current.some((obs) => isSameCell(obs, nextHead));
    const ateFood = isSameCell(nextHead, foodRef.current);

    const tailWillStay = ateFood || growthRef.current > 0;
    const collisionSegments = tailWillStay ? currentSnake : currentSnake.slice(0, -1);
    const hitSelf = collisionSegments.some((segment) => isSameCell(segment, nextHead));
    // ---------------------------------------------------------------

    // Verifica se morreu
    if (hitWall || hitObstacle || hitSelf) {
      const reason = hitSelf ? 'self' : (hitObstacle ? 'obstacle' : 'wall');
      setCrashType(reason);

      if (autoPlayRef.current) {
        setStatus('analyzing');
        statusRef.current = 'analyzing'; // Trava o loop
        askGeminiForEvolution(reason, currentSnake.length, lifetimeTicksRef.current);
      } else {
        setStatus('gameover');
        statusRef.current = 'gameover';
      }
      return;
    }

    // Move a cobra
    const nextSnake = currentSnake;
    nextSnake.unshift(nextHead);

    setDirection(nextDirection);
    directionRef.current = nextDirection;
    setLastMove(nextDirection);
    lastMoveRef.current = nextDirection;
    setGlowPosition({ x: ((nextHead.x + 0.5) / boardSize) * 100, y: ((nextHead.y + 0.5) / boardSize) * 100 });

    // Lógica ao comer
    if (ateFood) {
      growthRef.current += 1;
      const points = difficulty.score;
      setScore((s) => s + points);
      setBestScore((b) => Math.max(b, score + points));

      const maxCapacity = (boardSize * boardSize) - obstaclesRef.current.length;
      if (currentSnake.length + 1 >= maxCapacity) {
        setStatus('victory');
        statusRef.current = 'victory';
        setSnake([...nextSnake]);
        return;
      }

      const nextFood = createFood(boardSize, nextSnake);
      foodRef.current = nextFood;
      setFood(nextFood);
      setFoodSpawnId((id) => id + 1);
      setEatUntilMs(Date.now() + Math.max(260, difficulty.speed * 2.1));
      setEatEffect({ x: nextHead.x, y: nextHead.y, id: Date.now() });
    }

    if (growthRef.current > 0) growthRef.current -= 1;
    else nextSnake.pop();

    setSnake([...nextSnake]);
  }

  function resetGame(nextBoardSize = boardSize) {
    const startingSnakeCells = createSnake(nextBoardSize);
    const startingSnake = startingSnakeCells.map((segment) => ({
      id: getNextSegmentId(), x: segment.x, y: segment.y,
    }));
    const startingFood = createFood(nextBoardSize, startingSnake);

    setSnake(startingSnake);
    snakeRef.current = [...startingSnake];
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setQueuedDirection(null);
    queuedDirectionRef.current = null;
    setFood(startingFood);
    foodRef.current = startingFood;
    setCrashType('none');
    setStatus('ready');
    setScore(0);
    setLastMove(INITIAL_DIRECTION);
    lastMoveRef.current = INITIAL_DIRECTION;
    growthRef.current = 0;
    lifetimeTicksRef.current = 0;
    setFoodSpawnId((currentId) => currentId + 1);
    setEatUntilMs(0);
    setEatEffect(null);
    setGlowPosition({ x: ((startingSnake[0].x + 0.5) / nextBoardSize) * 100, y: ((startingSnake[0].y + 0.5) / nextBoardSize) * 100 });
  }

  function startGame() {
    if (status === 'gameover' || status === 'victory') resetGame(boardSize);
    setStatus('running');
  }

  function togglePause() {
    setStatus((currentStatus) => {
      if (currentStatus === 'running') return 'paused';
      if (currentStatus === 'paused') return 'running';
      if (currentStatus === 'ready') return 'running';
      return currentStatus;
    });
  }

  function handleDirection(nextDirection) {
    if (autoPlay) return;
    setQueuedDirection((current) => {
      const movingDirection = lastMoveRef.current;
      if (oppositeDirection(movingDirection, nextDirection)) return current;
      queuedDirectionRef.current = nextDirection;
      return nextDirection;
    });
  }

  function handleThemeChange(nextThemeId) {
    setThemeId(nextThemeId);
  }

  function handleDifficultyChange(nextDifficultyId) {
    setDifficultyId(nextDifficultyId);
    setStatus('ready');
  }

  async function toggleFullscreen() {
    if (!shellRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await shellRef.current.requestFullscreen();
  }

  const boardStyle = {
    '--accent': theme.accent, '--accent-strong': theme.accentStrong,
    '--board-bg': theme.board, '--grid-size': `${100 / boardSize}%`,
    '--glow-x': `${glowPosition.x}%`, '--glow-y': `${glowPosition.y}%`,
  };

  return (
    <main className="app-shell" style={boardStyle} ref={shellRef} data-fullscreen={isFullscreen ? 'true' : 'false'}>
      <div className="noise" />

      <section className="hero">
        <div className="hero-copy">
          <div>
            <span className="eyebrow">Snake AI Lab</span>
            <h1>Laboratório de Evolução com Gemini.</h1>
          </div>
          <div className="hero-meta">
            <p>Ative o modo Treino IA. A cobra tentará jogar. Se morrer, o Google Gemini vai analisar o erro e reprogramar a genética (pesos) da IA para a próxima geração!</p>
          </div>
        </div>

        <div className="game-shell">
          <div className="panel board-panel">

            <div className="hud-row" style={{ alignItems: 'center' }}>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>{autoPlay ? 'Geração' : 'Pontuação'}</span>
                <strong>{autoPlay ? `#${generation}` : score}</strong>
              </div>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>Status</span>
                <strong>
                  {status === 'analyzing' ? 'Gemini a pensar...'
                    : status === 'running' ? 'Em progresso'
                      : status === 'gameover' ? 'Morto'
                        : 'Pronto'}
                </strong>
              </div>
              <div className="hud-card" style={{ minWidth: 90, flexDirection: 'row', gap: '8px', display: 'flex', alignItems: 'center' }}>
                <button
                  className="chip-button"
                  style={{ fontWeight: autoPlay ? 700 : 400, background: autoPlay ? theme.accent : undefined, color: autoPlay ? '#000' : '#fff' }}
                  onClick={() => {
                    setAutoPlay(!autoPlay);
                    if (!autoPlay) {
                      setGeneration(1);
                      setAiWeights(defaultDumbWeights);
                      aiWeightsRef.current = defaultDumbWeights;
                      setTerminalLogs([]);
                      addLog("Treino de IA Iniciado. IA base carregada.", "system");
                    }
                  }}
                >
                  {autoPlay ? '🧪 Parar Treino' : '🧠 Iniciar Treino IA'}
                </button>

                {autoPlay && (
                  <button
                    className="chip-button"
                    style={{ background: '#ff6b8a', color: '#fff', fontWeight: 600 }}
                    onClick={() => {
                      setGeneration(1);
                      setAiWeights(defaultDumbWeights);
                      aiWeightsRef.current = defaultDumbWeights;
                      setTerminalLogs([]);
                      addLog("Memória apagada. A IA voltou a ser burrinha!", "error");
                      resetGame(boardSize);
                      startGame();
                    }}
                  >
                    🔄 Resetar IA
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {autoPlay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', gap: '10px', padding: '10px 20px', background: 'rgba(0,0,0,0.4)', borderBottom: `1px solid ${theme.accent}40`, fontSize: '0.85rem', color: '#aaa', justifyContent: 'center' }}
                >
                  <span>🍔 Atração: <strong style={{ color: '#fff' }}>{aiWeights.foodAttraction.toFixed(1)}</strong></span> |
                  <span>🌌 Espaço: <strong style={{ color: '#fff' }}>{aiWeights.spacePriority.toFixed(1)}</strong></span> |
                  <span>🧱 Medo Parede: <strong style={{ color: '#fff' }}>{aiWeights.edgeAvoidance.toFixed(1)}</strong></span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="board-frame"
              animate={status === 'gameover' && crashType === 'self' ? { x: [0, -9, 9, -7, 7, -4, 4, 0], rotate: [0, -0.8, 0.8, -0.4, 0.4, 0] } : { x: 0, rotate: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              <div className="board-grid" />
              <motion.div className="board-glow" animate={{ opacity: status === 'running' ? 0.8 : 0.55 }} transition={{ duration: 0.9 }} />

              <div className="board-content">
                {snake.map((segment, index) => {
                  const size = 100 / boardSize;
                  return (
                    <motion.div
                      key={segment.id}
                      className="snake-segment"
                      initial={false}
                      animate={{
                        opacity: 1, scale: index === 0 ? (isEating ? 1.2 : 1.08) : 1,
                        left: `${segment.x * size}%`, top: `${segment.y * size}%`,
                      }}
                      transition={{ type: 'tween', duration: segmentTravelDuration, ease: 'linear' }}
                      style={{ width: `${size}%`, height: `${size}%`, zIndex: 2 }}
                    >
                      <SnakeSegmentSvg isHead={index === 0} fill={index === 0 ? theme.snakeHead : theme.snakeBody} direction={lastMove} isEating={index === 0 && isEating} />
                    </motion.div>
                  );
                })}

                <motion.div
                  className="food-piece"
                  animate={{ left: `${food.x * (100 / boardSize)}%`, top: `${food.y * (100 / boardSize)}%` }}
                  transition={{ type: 'tween', duration: 0.28, ease: 'easeInOut' }}
                  style={{ width: `${100 / boardSize}%`, height: `${100 / boardSize}%`, boxShadow: `0 0 28px color-mix(in srgb, ${theme.food} 55%, transparent)` }}
                >
                  <motion.div key={foodSpawnId} className="food-pulse" animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }} transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}>
                    <FoodSvg fill={theme.food} />
                  </motion.div>
                </motion.div>
              </div>

              {/* OVERLAYS CORRIGIDOS COM Z-INDEX 999 */}
              <AnimatePresence>
                {status === 'analyzing' && (
                  <motion.div
                    className="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ zIndex: 999, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <motion.div className="overlay-card" style={{ border: `2px solid ${theme.accent}` }}>
                      <h3 style={{ color: theme.accent }}>✨ Evolução da Espécie</h3>
                      <p>A Geração {generation} morreu. A conectar à API do Gemini para processar os erros e ajustar o código genético...</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {(status === 'ready' || status === 'paused' || status === 'gameover' || status === 'victory') && (
                  <motion.div
                    className="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ zIndex: 999, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <motion.div className="overlay-card">
                      <h3>
                        {status === 'victory' ? '🏆 Jogo Finalizado!'
                          : status === 'gameover' ? 'Fim de jogo'
                            : status === 'paused' ? 'Jogo pausado'
                              : 'Pronto para começar'}
                      </h3>
                      <p>
                        {status === 'gameover' ? 'Aperte Enter para reiniciar manualmente.' : 'Inicie o treino da IA no botão acima, ou jogue manualmente.'}
                      </p>
                      <div className="control-row" style={{ justifyContent: 'center' }}>
                        <button className="action-button" type="button" onClick={startGame}>
                          {status === 'gameover' || status === 'victory' ? 'Jogar novamente' : 'Iniciar'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <aside className="panel sidebar">

            {/* TERMINAL ADICIONADO AO TOPO DA SIDEBAR QUANDO AUTOPLAY ESTÁ ON */}
            {autoPlay && (
              <section className="sidebar-section">
                <h2>Terminal IA</h2>
                <div style={{
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 8,
                  padding: 10,
                  height: 220,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  border: `1px solid ${theme.accent}40`,
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
                }}>
                  {terminalLogs.map(log => {
                    let color = '#fff';
                    if (log.type === 'error') color = '#ff6b8a';
                    if (log.type === 'success') color = '#6cf7d6';
                    if (log.type === 'thought') color = '#a1a1aa';

                    return (
                      <div key={log.id} style={{ color }}>
                        <span style={{ opacity: 0.4 }}>[{log.time}]</span> {log.msg}
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              </section>
            )}

            <section className="sidebar-section">
              <h2>Controles</h2>
              <div className="control-row">
                <button className="action-button" type="button" onClick={startGame}>
                  Start
                </button>
                <button className="chip-button" type="button" onClick={toggleFullscreen}>
                  {isFullscreen ? 'Sair' : 'Tela cheia'}
                </button>
                <button className="chip-button" type="button" onClick={togglePause}>
                  Pausar
                </button>
                <button className="chip-button" type="button" onClick={() => resetGame(boardSize)}>
                  Reiniciar
                </button>
              </div>
              <p className="helper-text" style={{ marginTop: 14 }}>
                Use setas, WASD ou os botões de toque para mover a cobrinha. Enter inicia ou reinicia depois de uma derrota.
              </p>
            </section>

            <section className="sidebar-section">
              <h2>Dificuldade</h2>
              <div className="difficulty-grid">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.id}
                    className="difficulty-option"
                    type="button"
                    data-active={item.id === difficultyId}
                    onClick={() => handleDifficultyChange(item.id)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <span className="helper-text" style={{ display: 'block', marginTop: 4 }}>
                        {item.note}
                      </span>
                    </span>
                    <span className="kbd">{item.size}x{item.size}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="sidebar-section">
              <h2>Estilo</h2>
              <div className="theme-grid">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    className="theme-option"
                    type="button"
                    data-active={item.id === themeId}
                    onClick={() => handleThemeChange(item.id)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <span className="helper-text" style={{ display: 'block', marginTop: 4 }}>
                        {item.description}
                      </span>
                    </span>
                    <span className="swatch" style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.accentStrong})` }} />
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}