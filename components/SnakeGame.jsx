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
    board: 'linear-gradient(145deg, rgba(8, 19, 30, 1), rgba(14, 28, 50, 1))',
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
    board: 'linear-gradient(145deg, rgba(37, 18, 40, 1), rgba(70, 26, 47, 1))',
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
    board: 'linear-gradient(145deg, rgba(10, 32, 26, 1), rgba(11, 48, 38, 1))',
    snakeHead: '#e6ffe0',
    snakeBody: '#85f29e',
    food: '#ffd86d',
    glow: '#97f27d',
    description: 'Mais orgânico e suave.',
  },
];

const INITIAL_DIRECTION = { x: 1, y: 0 };
const MAX_STAMINA = 150;

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

function calculateWeightedMove(head, food, snake, obstacles, powerups, boardSize, lastMove, weights, isIntangible, currentStamina) {
  const possibleMoves = [
    DIRECTIONS.ArrowUp, DIRECTIONS.ArrowDown,
    DIRECTIONS.ArrowLeft, DIRECTIONS.ArrowRight,
  ];

  const bodyLength = snake.length;

  const isSafe = (x, y) => {
    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return isIntangible;
    if (!isIntangible) {
        if (obstacles.some(obs => obs.x === x && obs.y === y)) return false;
        const body = snake.slice(0, snake.length - 1);
        if (body.some(segment => segment.x === x && segment.y === y)) return false;
    }
    return true;
  };

  const countFreeSpace = (startX, startY, limit = 100) => {
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
  let currentThought = null;

  for (const move of possibleMoves) {
    if (oppositeDirection(lastMove, move)) continue;

    const nextX = head.x + move.x;
    const nextY = head.y + move.y;
    const safe = isSafe(nextX, nextY);

    const isWallCrash = (nextX < 0 || nextX >= boardSize || nextY < 0 || nextY >= boardSize) ? 1 : 0;
    const isSelfCrash = (!safe && !isWallCrash) ? 1 : 0;

    const distToFood = Math.abs(nextX - food.x) + Math.abs(nextY - food.y);
    const freeSpace = safe ? countFreeSpace(nextX, nextY, Math.max(boardSize * 3, bodyLength + 10)) : 0;
    
    let nearestPowerupDist = Infinity;
    for(const p of powerups) {
        const pDist = Math.abs(nextX - p.x) + Math.abs(nextY - p.y);
        if (pDist < nearestPowerupDist) nearestPowerupDist = pDist;
    }

    let score = Math.random() * 0.5; 
    let dynamicFoodAttraction = weights.foodAttraction;

    if (freeSpace < bodyLength && !isIntangible && safe) {
      score -= 5000 * weights.spacePriority; 
      if (score > highestScore) currentThought = "Beco evitado! Priorizando espaço.";
    } else {
      score += freeSpace * weights.spacePriority;
    }

    if (currentStamina < (MAX_STAMINA * 0.3)) {
      dynamicFoodAttraction *= weights.staminaPriority; 
      if (score > highestScore) currentThought = "Fôlego crítico! Rota direta para comida!";
    }

    score += (100 / (distToFood + 1)) * dynamicFoodAttraction;
    
    if (nearestPowerupDist !== Infinity) {
        score += (300 / (nearestPowerupDist + 1)) * dynamicFoodAttraction; 
    }

    if (isSelfCrash && !isIntangible) score -= 10000 * weights.spacePriority;

    if (isWallCrash) {
        if (!isIntangible) score -= 10000 * weights.edgeAvoidance;
    } else {
      const huggingWall = (nextX === 0 || nextX === boardSize - 1 || nextY === 0 || nextY === boardSize - 1) ? 1 : 0;
      score -= huggingWall * weights.edgeAvoidance;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMove = move;

      if (nearestPowerupDist < distToFood + 5 && currentStamina > 40) currentThought = "⚡ Power-up detetado!";
      else if (isIntangible && isWallCrash) currentThought = "👻 Modo Fantasma: Atravessando parede.";
      else if (!safe && !isIntangible) currentThought = "⚠️ Risco de colisão detetado!";
    }
  }

  return { move: bestMove, thought: currentThought };
}

function createFood(boardSize, snake, obstacles = [], powerups = []) {
  let position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
  let attempts = 0;
  while (
    attempts < boardSize * boardSize * 2 &&
    (snake.some((segment) => isSameCell(segment, position)) || 
     obstacles.some((obs) => isSameCell(obs, position)) ||
     powerups.some((p) => isSameCell(p, position)) ||
     isCornerCell(boardSize, position))
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
  const rotation = direction === 'up' ? 0 : direction === 'right' ? 90 : direction === 'down' ? 180 : 270;
  return (
    <svg className="icon-arrow" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M12 3l7 9h-4v9H9v-9H5l7-9z" fill="currentColor" />
    </svg>
  );
}

function SnakeSegmentSvg({ isHead, fill, direction, isEating }) {
  const headRotation = direction.x === 1 && direction.y === 0 ? 90 : direction.x === -1 && direction.y === 0 ? 270 : direction.x === 0 && direction.y === 1 ? 180 : 0;
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

  const [enablePowerups, setEnablePowerups] = useState(true);
  const [enableObstacles, setEnableObstacles] = useState(true);
  const enablePowerupsRef = useRef(true);
  const enableObstaclesRef = useRef(true);

  const defaultDumbWeights = { foodAttraction: 2.0, spacePriority: 0.5, edgeAvoidance: 2.0, staminaPriority: 1.0 };

  const [generation, setGeneration] = useState(1);
  const [aiWeights, setAiWeights] = useState(defaultDumbWeights);
  const aiWeightsRef = useRef(aiWeights);
  const apiCooldownUntil = useRef(0);

  // --- PLACAR E PONTUAÇÕES ---
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [userBestScore, setUserBestScore] = useState(0);
  const [aiBestScore, setAiBestScore] = useState(0);

  // --- TERMINAIS SEPARADOS ---
  const [evolutionLogs, setEvolutionLogs] = useState([]);
  const [gameplayLogs, setGameplayLogs] = useState([]);
  const evolutionTerminalRef = useRef(null);
  const gameplayTerminalRef = useRef(null);

  const addEvolutionLog = (msg, type = 'system') => {
    setEvolutionLogs(prev => {
      const newLogs = [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString([], { hour12: false }) }];
      return newLogs.slice(-15);
    });
  };

  const addGameplayLog = (msg, type = 'thought') => {
    setGameplayLogs(prev => {
      const newLogs = [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString([], { hour12: false }) }];
      return newLogs.slice(-15);
    });
  };

  // Auto-scroll independente para os terminais
  useEffect(() => {
    if (evolutionTerminalRef.current) {
      const { scrollHeight, clientHeight } = evolutionTerminalRef.current;
      evolutionTerminalRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [evolutionLogs]);

  useEffect(() => {
    if (gameplayTerminalRef.current) {
      const { scrollHeight, clientHeight } = gameplayTerminalRef.current;
      gameplayTerminalRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [gameplayLogs]);

  const [difficultyId, setDifficultyId] = useState('normal');
  const [themeId, setThemeId] = useState('neon');

  const [snake, setSnake] = useState([]);
  const snakeRef = useRef([]);
  const [obstacles, setObstacles] = useState([]);
  const obstaclesRef = useRef([]);
  
  const [powerups, setPowerups] = useState([]);
  const powerupsRef = useRef([]);
  const powerupStateRef = useRef(null);
  const powerupTimerRef = useRef(0);

  const [stamina, setStamina] = useState(MAX_STAMINA);
  const staminaRef = useRef(MAX_STAMINA);

  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState(null);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState('ready');
  const statusRef = useRef('ready');
  
  const [lastMove, setLastMove] = useState({ x: 1, y: 0 });
  const [foodSpawnId, setFoodSpawnId] = useState(0);
  const [eatUntilMs, setEatUntilMs] = useState(0);
  const [eatEffect, setEatEffect] = useState(null);
  const [crashType, setCrashType] = useState('none');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const lastThoughtRef = useRef('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef(null);
  const boardRef = useRef(null); 

  const segmentIdRef = useRef(0);
  const directionRef = useRef(INITIAL_DIRECTION);
  const queuedDirectionRef = useRef(null);
  const foodRef = useRef({ x: 0, y: 0 });
  const lastMoveRef = useRef(INITIAL_DIRECTION);
  const growthRef = useRef(0);
  const lifetimeTicksRef = useRef(0);

  const difficulty = useMemo(() => DIFFICULTIES.find((item) => item.id === difficultyId) ?? DIFFICULTIES[1], [difficultyId]);
  const theme = useMemo(() => THEMES.find((item) => item.id === themeId) ?? THEMES[0], [themeId]);

  const boardSize = difficulty.size;
  const segmentTravelDuration = useMemo(() => Math.max(0.06, (difficulty.speed / 1000) * 0.85), [difficulty.speed]);
  const isEating = eatUntilMs > Date.now();

  function getNextSegmentId() {
    segmentIdRef.current += 1;
    return segmentIdRef.current;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.backgroundColor = '#040a12';
      document.body.style.background = theme.board;
      document.body.style.color = '#ffffff';
      document.body.style.margin = "0";
      document.body.style.minHeight = "100vh";
      document.body.style.overflowX = "hidden";
    }
  }, [theme]);

  useEffect(() => { enablePowerupsRef.current = enablePowerups; }, [enablePowerups]);
  useEffect(() => { enableObstaclesRef.current = enableObstacles; }, [enableObstacles]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { aiWeightsRef.current = aiWeights; }, [aiWeights]);
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const savedUserBest = Number(window.localStorage.getItem('snake-user-best') ?? 0);
    const savedAiBest = Number(window.localStorage.getItem('snake-ai-best') ?? 0);
    if (Number.isFinite(savedUserBest)) setUserBestScore(savedUserBest);
    if (Number.isFinite(savedAiBest)) setAiBestScore(savedAiBest);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('snake-user-best', String(userBestScore));
        window.localStorage.setItem('snake-ai-best', String(aiBestScore));
    }
  }, [userBestScore, aiBestScore]);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { queuedDirectionRef.current = queuedDirection; }, [queuedDirection]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { powerupsRef.current = powerups; }, [powerups]);
  useEffect(() => { lastMoveRef.current = lastMove; }, [lastMove]);
  useEffect(() => { staminaRef.current = stamina; }, [stamina]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === boardRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    resetGame(boardSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize, enableObstacles, enablePowerups]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === 'Space') { togglePause(); return; }
      if (event.code === 'Enter') {
        if (status === 'gameover' || status === 'victory') { resetGame(boardSize); startGame(); } 
        else if (status === 'ready') startGame();
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

  async function askGeminiForEvolution(deathReason, length, ticks) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const reasonPT = deathReason === 'self' ? 'o próprio corpo' : 
                     deathReason === 'wall' ? 'a parede' : 
                     deathReason === 'starvation' ? 'inanição (falta de fôlego/stamina)' : 'um obstáculo';
    
    addEvolutionLog(`☠️ Morto por ${reasonPT}. Tamanho: ${length}`, "system");
    addEvolutionLog("A conectar à API (Gemini)...", "system"); 

    if (!apiKey || Date.now() < apiCooldownUntil.current) {
      setTimeout(() => triggerLocalMutation(), 2000);
      return;
    }

    const prompt = `
    Você é a consciência de uma Inteligência Artificial que joga Snake e acabou de morrer.
    A sua Geração ${generation} falhou.
    Motivo da morte: Colidiu com ${reasonPT}.
    Tamanho alcançado: ${length}. Passos dados na vida: ${ticks}.
    
    Seus pesos genéticos atuais são:
    - foodAttraction (Vontade de comer): ${aiWeightsRef.current.foodAttraction.toFixed(2)}
    - spacePriority (Vontade de fugir do próprio corpo e evitar becos): ${aiWeightsRef.current.spacePriority.toFixed(2)}
    - edgeAvoidance (Medo das paredes do mapa): ${aiWeightsRef.current.edgeAvoidance.toFixed(2)}
    - staminaPriority (Desespero por comida quando o fôlego acaba): ${aiWeightsRef.current.staminaPriority.toFixed(2)}
    
    REGRAS OBRIGATÓRIAS PARA A SUA EVOLUÇÃO:
    1. Se morreu na PAREDE, você precisa de OBRIGATORIAMENTE aumentar o "edgeAvoidance".
    2. Se bateu no PRÓPRIO CORPO, aumente drasticamente o "spacePriority".
    3. Se morreu por INANIÇÃO (falta de fôlego), aumente o "staminaPriority" e o "foodAttraction".
    4. TODOS os valores devem ser números POSITIVOS (nunca use números negativos).
    5. O campo "thought" DEVE ser escrito OBRIGATORIAMENTE em Português (PT-BR) em primeira pessoa.
    
    Retorne APENAS um JSON válido.
    
    Exemplo de retorno esperado:
    {
      "thought": "Caramba, bati na parede porque fui muito guloso. Vou aumentar o meu medo de bordas.",
      "foodAttraction": 5.5,
      "spacePriority": 2.0,
      "edgeAvoidance": 50.0,
      "staminaPriority": 1.5
    }
    `;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `${response.status}`);
      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const newWeights = JSON.parse(text);

      if (newWeights.edgeAvoidance < 0) newWeights.edgeAvoidance = Math.abs(newWeights.edgeAvoidance);
      if (newWeights.spacePriority < 0) newWeights.spacePriority = Math.abs(newWeights.spacePriority);
      if (typeof newWeights.staminaPriority !== 'number') newWeights.staminaPriority = aiWeightsRef.current.staminaPriority + 0.5;

      if (newWeights.thought) addEvolutionLog(`🧠 IA: "${newWeights.thought}"`, "gemini-thought");
      addEvolutionLog(`[Evolução] C:${newWeights.foodAttraction.toFixed(1)} | E:${newWeights.spacePriority.toFixed(1)} | P:${newWeights.edgeAvoidance.toFixed(1)} | S:${newWeights.staminaPriority.toFixed(1)}`, "success");

      setTimeout(() => {
        setAiWeights(newWeights);
        setGeneration(g => g + 1);
        resetGame(boardSize);
        startGame();
      }, 3500); 

    } catch (error) {
      if (error.message.includes('429')) apiCooldownUntil.current = Date.now() + 60000;
      setTimeout(() => triggerLocalMutation(), 1500);
    }
  }

  function triggerLocalMutation() {
    setAiWeights(prev => {
      const newWeights = {
        foodAttraction: Math.max(0.1, prev.foodAttraction + (Math.random() * 4 - 1)),
        spacePriority: Math.max(0, prev.spacePriority + (Math.random() * 2 - 0.5)),
        edgeAvoidance: Math.abs(prev.edgeAvoidance + (Math.random() * 10 - 2)),
        staminaPriority: prev.staminaPriority ? prev.staminaPriority + (Math.random() * 1.5) : 1.5
      };
      addEvolutionLog(`💡 IA Local: "Ajustando parâmetros de segurança."`, "gemini-thought");
      addEvolutionLog(`[Evolução] Mutações aplicadas localmente.`, "success");
      return newWeights;
    });
    setGeneration(g => g + 1);
    resetGame(boardSize);
    startGame();
  }

  function spawnObstacle() {
    let position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
    let attempts = 0;
    while (
      attempts < 100 &&
      (snakeRef.current.some(s => isSameCell(s, position)) || 
       isSameCell(position, foodRef.current) || 
       obstaclesRef.current.some(o => isSameCell(o, position)) ||
       powerupsRef.current.some(p => isSameCell(p, position)) ||
       isCornerCell(boardSize, position))
    ) {
      position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
      attempts++;
    }

    if (attempts < 100) {
      obstaclesRef.current.push(position);
      setObstacles([...obstaclesRef.current]);
    }
  }

  function spawnPowerup() {
    if (powerupsRef.current.length >= 2) return; 
    
    // BALANCEAMENTO: Powerup azul (shrink) agora é mais raro (15%)
    const rand = Math.random();
    let type = 'bonus'; 
    if (rand > 0.85) type = 'shrink'; // 15% de chance
    else if (rand > 0.60) type = 'intangivel'; // 25% de chance
    // Os outros 60% são para o 'bonus' de pontos
    
    let position = { x: getRandomInt(boardSize), y: getRandomInt(boardSize), type, id: Date.now() + Math.random() };
    let attempts = 0;

    while (
      attempts < 100 &&
      (snakeRef.current.some(s => isSameCell(s, position)) || 
       isSameCell(position, foodRef.current) || 
       obstaclesRef.current.some(o => isSameCell(o, position)) ||
       powerupsRef.current.some(p => isSameCell(p, position)) ||
       isCornerCell(boardSize, position))
    ) {
      position = { ...position, x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
      attempts++;
    }

    if (attempts < 100) {
      powerupsRef.current.push(position);
      setPowerups([...powerupsRef.current]);
      
      setTimeout(() => {
        powerupsRef.current = powerupsRef.current.filter(p => p.id !== position.id);
        setPowerups([...powerupsRef.current]);
      }, 12000); 
    }
  }

  function runGameTick() {
    if (statusRef.current !== 'running') return;

    const currentSnake = snakeRef.current;
    if (currentSnake.length === 0) return;

    lifetimeTicksRef.current += 1;
    staminaRef.current -= 1;
    setStamina(staminaRef.current);

    if (staminaRef.current <= 0) {
        setCrashType('starvation');
        if (autoPlayRef.current) {
            setStatus('analyzing');
            statusRef.current = 'analyzing'; 
            askGeminiForEvolution('starvation', currentSnake.length, lifetimeTicksRef.current);
        } else {
            setStatus('gameover');
            statusRef.current = 'gameover';
        }
        return;
    }

    let nextDirection = queuedDirectionRef.current ?? directionRef.current;
    const isIntangibleStatus = powerupStateRef.current === 'intangivel' && powerupTimerRef.current > 0;

    if (autoPlayRef.current) {
      const aiResult = calculateWeightedMove(
        currentSnake[0], foodRef.current, currentSnake, obstaclesRef.current, powerupsRef.current, boardSize, lastMoveRef.current, aiWeightsRef.current, isIntangibleStatus, staminaRef.current
      );
      if (aiResult.move) {
        nextDirection = aiResult.move;
        setQueuedDirection(null);
        queuedDirectionRef.current = null;
        
        if (aiResult.thought && aiResult.thought !== lastThoughtRef.current) {
            addGameplayLog(`💭 ${aiResult.thought}`, "thought");
            lastThoughtRef.current = aiResult.thought;
        }
      }
    }

    if (oppositeDirection(lastMoveRef.current, nextDirection)) {
      nextDirection = directionRef.current;
      setQueuedDirection(null);
      queuedDirectionRef.current = null;
    }

    const head = currentSnake[0];
    const nextHead = { id: getNextSegmentId(), x: head.x + nextDirection.x, y: head.y + nextDirection.y };

    if (powerupTimerRef.current > 0) {
        powerupTimerRef.current -= 1;
        if (powerupTimerRef.current === 0) {
            powerupStateRef.current = null;
            if(autoPlayRef.current) addGameplayLog("Modo Fantasma finalizado.", "thought");
        }
    }

    let hitWall = nextHead.x < 0 || nextHead.x >= boardSize || nextHead.y < 0 || nextHead.y >= boardSize;
    
    if (isIntangibleStatus && hitWall) {
        if (nextHead.x < 0) nextHead.x = boardSize - 1;
        else if (nextHead.x >= boardSize) nextHead.x = 0;
        if (nextHead.y < 0) nextHead.y = boardSize - 1;
        else if (nextHead.y >= boardSize) nextHead.y = 0;
        hitWall = false; 
    }

    const hitObstacle = obstaclesRef.current.some((obs) => isSameCell(obs, nextHead));
    const ateFood = isSameCell(nextHead, foodRef.current);
    const powerupIdx = powerupsRef.current.findIndex((p) => isSameCell(p, nextHead));

    const tailWillStay = ateFood || growthRef.current > 0;
    const collisionSegments = tailWillStay ? currentSnake : currentSnake.slice(0, -1);
    const hitSelf = collisionSegments.some((segment) => isSameCell(segment, nextHead));

    if (hitWall || (hitObstacle && !isIntangibleStatus) || (hitSelf && !isIntangibleStatus)) {
      const reason = hitSelf ? 'self' : (hitObstacle ? 'obstacle' : 'wall');
      setCrashType(reason);

      if (autoPlayRef.current) {
        setStatus('analyzing');
        statusRef.current = 'analyzing'; 
        askGeminiForEvolution(reason, currentSnake.length, lifetimeTicksRef.current);
      } else {
        setStatus('gameover');
        statusRef.current = 'gameover';
      }
      return;
    }

    const nextSnake = currentSnake;
    nextSnake.unshift(nextHead);

    setDirection(nextDirection);
    directionRef.current = nextDirection;
    setLastMove(nextDirection);
    lastMoveRef.current = nextDirection;
    setGlowPosition({ x: ((nextHead.x + 0.5) / boardSize) * 100, y: ((nextHead.y + 0.5) / boardSize) * 100 });

    if (powerupIdx !== -1) {
        const p = powerupsRef.current[powerupIdx];
        if (p.type === 'bonus') {
            scoreRef.current += 50;
            setScore(scoreRef.current);
            if (autoPlayRef.current) setAiBestScore(b => Math.max(b, scoreRef.current));
            else setUserBestScore(b => Math.max(b, scoreRef.current));
            
            if(autoPlayRef.current) addGameplayLog("Bônus apanhado! +50 pts", "success");
        } else if (p.type === 'shrink') {
            const amountToRemove = Math.floor(nextSnake.length / 2);
            for(let i=0; i < amountToRemove; i++) {
                if (nextSnake.length > 2) nextSnake.pop();
            }
            if(autoPlayRef.current) addGameplayLog("Encolhimento ativado!", "success");
        } else if (p.type === 'intangivel') {
            powerupStateRef.current = 'intangivel';
            powerupTimerRef.current = 50; 
            if(autoPlayRef.current) addGameplayLog("Modo Fantasma Ativo!", "success");
        }
        powerupsRef.current.splice(powerupIdx, 1);
        setPowerups([...powerupsRef.current]);
    }

    if (ateFood) {
      growthRef.current += 1;
      staminaRef.current = MAX_STAMINA;
      setStamina(MAX_STAMINA);

      // ATUALIZAÇÃO DA PONTUAÇÃO (Ref e State)
      const points = difficulty.score;
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (autoPlayRef.current) {
        setAiBestScore(b => Math.max(b, scoreRef.current));
      } else {
        setUserBestScore(b => Math.max(b, scoreRef.current));
      }

      const maxCapacity = (boardSize * boardSize) - obstaclesRef.current.length;
      if (currentSnake.length + 1 >= maxCapacity) {
        setStatus('victory');
        statusRef.current = 'victory';
        setSnake([...nextSnake]);
        return;
      }

      const nextFood = createFood(boardSize, nextSnake, obstaclesRef.current, powerupsRef.current);
      foodRef.current = nextFood;
      setFood(nextFood);
      
      const newSpawnId = foodSpawnId + 1;
      setFoodSpawnId(newSpawnId);
      
      if (newSpawnId % 4 === 0 && enableObstaclesRef.current) spawnObstacle();
      // O TEMPO ENTRE OS POWERUPS AUMENTOU DE 5 PARA 7 (Deixando mais raros)
      if (newSpawnId % 7 === 0 && enablePowerupsRef.current) spawnPowerup();

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
    
    obstaclesRef.current = [];
    setObstacles([]);
    const startingFood = createFood(nextBoardSize, startingSnake, [], []);
    foodRef.current = startingFood;
    
    if (enableObstaclesRef.current) {
        for(let i=0; i<3; i++) spawnObstacle();
    }

    setSnake(startingSnake);
    snakeRef.current = [...startingSnake];
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setQueuedDirection(null);
    queuedDirectionRef.current = null;
    setFood(startingFood);
    
    setCrashType('none');
    setStatus('ready');
    
    setScore(0);
    scoreRef.current = 0; // Zera a referência síncrona
    
    setLastMove(INITIAL_DIRECTION);
    lastMoveRef.current = INITIAL_DIRECTION;
    growthRef.current = 0;
    lifetimeTicksRef.current = 0;
    setFoodSpawnId((currentId) => currentId + 1);
    setEatUntilMs(0);
    setEatEffect(null);
    setGlowPosition({ x: ((startingSnake[0].x + 0.5) / nextBoardSize) * 100, y: ((startingSnake[0].y + 0.5) / nextBoardSize) * 100 });
    
    powerupsRef.current = [];
    setPowerups([]);
    powerupStateRef.current = null;
    powerupTimerRef.current = 0;
    lastThoughtRef.current = '';

    staminaRef.current = MAX_STAMINA;
    setStamina(MAX_STAMINA);
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
    if (!boardRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await boardRef.current.requestFullscreen();
    }
  }

  const boardStyle = {
    '--accent': theme.accent, '--accent-strong': theme.accentStrong,
    '--board-bg': theme.board, '--grid-size': `${100 / boardSize}%`,
    '--glow-x': `${glowPosition.x}%`, '--glow-y': `${glowPosition.y}%`,
    width: '100%' 
  };

  const isIntangibleRender = powerupStateRef.current === 'intangivel' && powerupTimerRef.current > 0;

  return (
    <main className="app-shell" style={boardStyle} ref={shellRef} data-fullscreen={isFullscreen ? 'true' : 'false'}>
      <div className="noise" />

      <motion.section layout className="hero">
        <motion.div layout className="hero-copy">
          <div>
            <span className="eyebrow">Snake AI Lab</span>
            <h1>Laboratório de Evolução com Gemini.</h1>
          </div>
          <div className="hero-meta">
            <p>Ative o modo Treino IA. A cobra tentará jogar. Se morrer, o Google Gemini vai analisar o erro e reprogramar a genética (pesos) da IA para a próxima geração!</p>
          </div>
        </motion.div>

        <motion.div layout className="game-shell">
          <motion.div layout className="panel board-panel">

            <motion.div layout className="hud-row" style={{ alignItems: 'center' }}>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>{autoPlay ? 'Geração' : 'Pontuação Atual'}</span>
                <strong>{autoPlay ? `#${generation}` : score}</strong>
              </div>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>Fôlego</span>
                <strong style={{ color: stamina < 40 ? '#ff6b8a' : theme.accent }}>
                    {Math.floor((stamina / MAX_STAMINA) * 100)}%
                </strong>
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
                      setEvolutionLogs([]);
                      setGameplayLogs([]);
                      addEvolutionLog("Treino de IA Iniciado. IA base carregada.", "system");
                    }
                  }}
                >
                  {autoPlay ? '🧪 Assumir Controle (Player)' : '🧠 Iniciar Treino IA'}
                </button>

                {autoPlay && (
                  <button
                    className="chip-button"
                    style={{ background: '#ff6b8a', color: '#fff', fontWeight: 600 }}
                    onClick={() => {
                      setGeneration(1);
                      setAiWeights(defaultDumbWeights);
                      aiWeightsRef.current = defaultDumbWeights;
                      setEvolutionLogs([]);
                      setGameplayLogs([]);
                      addEvolutionLog("Memória apagada.", "error");
                      resetGame(boardSize);
                      startGame();
                    }}
                  >
                    🔄 Resetar IA
                  </button>
                )}
              </div>
            </motion.div>

            <AnimatePresence>
              {autoPlay && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', gap: '10px', padding: '10px 20px', background: 'rgba(0,0,0,0.4)', borderBottom: `1px solid ${theme.accent}40`, fontSize: '0.85rem', color: '#aaa', justifyContent: 'center', flexWrap: 'wrap' }}
                >
                  <span>🍔 Atração: <strong style={{ color: '#fff' }}>{aiWeights.foodAttraction.toFixed(1)}</strong></span> |
                  <span>🌌 Espaço: <strong style={{ color: '#fff' }}>{aiWeights.spacePriority.toFixed(1)}</strong></span> |
                  <span>🧱 Medo Parede: <strong style={{ color: '#fff' }}>{aiWeights.edgeAvoidance.toFixed(1)}</strong></span> |
                  <span>⚡ Pânico Fôlego: <strong style={{ color: '#fff' }}>{aiWeights.staminaPriority ? aiWeights.staminaPriority.toFixed(1) : '1.0'}</strong></span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              className="board-frame"
              ref={boardRef} 
              animate={status === 'gameover' && crashType === 'self' ? { x: [0, -9, 9, -7, 7, -4, 4, 0], rotate: [0, -0.8, 0.8, -0.4, 0.4, 0] } : { x: 0, rotate: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{ background: isFullscreen ? theme.board : 'transparent' }} 
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
                        opacity: isIntangibleRender ? 0.4 : 1, 
                        scale: index === 0 ? (isEating ? 1.2 : 1.08) : 1,
                        left: `${segment.x * size}%`, top: `${segment.y * size}%`,
                      }}
                      transition={{ type: 'tween', duration: segmentTravelDuration, ease: 'linear' }}
                      style={{ width: `${size}%`, height: `${size}%`, zIndex: 2 }}
                    >
                      <SnakeSegmentSvg isHead={index === 0} fill={index === 0 ? theme.snakeHead : theme.snakeBody} direction={lastMove} isEating={index === 0 && isEating} />
                    </motion.div>
                  );
                })}
                
                {obstacles.map((obs) => {
                  const size = 100 / boardSize;
                  return (
                    <motion.div
                      key={`obs-${obs.x}-${obs.y}`}
                      className="obstacle-piece"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ left: `${obs.x * size}%`, top: `${obs.y * size}%`, opacity: 1, scale: 1 }}
                      transition={{ type: 'spring' }}
                      style={{
                        position: 'absolute', width: `${size}%`, height: `${size}%`, 
                        background: 'linear-gradient(135deg, #d32f2f 0%, #4a0000 100%)', 
                        borderRadius: '25%', border: '2px solid #ffcccc', zIndex: 1, boxShadow: '0 0 15px rgba(255,0,0,0.6)',
                      }}
                    />
                  );
                })}

                {powerups.map((p) => {
                  const size = 100 / boardSize;
                  let color = '#f7e06c';
                  if (p.type === 'shrink') color = '#6cf7d6';
                  if (p.type === 'intangivel') color = '#ff6b8a';
                  return (
                    <div
                      key={p.id}
                      className="powerup-piece"
                      style={{ position: 'absolute', width: `${size}%`, height: `${size}%`, left: `${p.x * size}%`, top: `${p.y * size}%`, zIndex: 3 }}
                    >
                      <motion.div 
                        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        animate={{ scale: [1, 1.25, 1], rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <svg width="80%" height="80%" viewBox="0 0 100 100">
                          {p.type === 'bonus' && <circle cx="50" cy="50" r="36" fill={color} stroke="#fff" strokeWidth="6" />}
                          {p.type === 'shrink' && <rect x="18" y="18" width="64" height="64" rx="18" fill={color} stroke="#fff" strokeWidth="6" />}
                          {p.type === 'intangivel' && <polygon points="50,10 90,90 10,90" fill={color} stroke="#fff" strokeWidth="6" />}
                        </svg>
                      </motion.div>
                    </div>
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
                        {status === 'gameover' ? 'Aperte Enter para reiniciar.' : 'Inicie o treino da IA no botão acima, ou jogue manualmente.'}
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
          </motion.div>

          <motion.aside layout className="panel sidebar">

            {/* SEÇÃO DA TABELA DE COMPETIÇÃO */}
            <motion.section layout className="sidebar-section">
              <h2>Placar Humano vs IA</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px', borderLeft: `4px solid ${theme.accent}` }}>
                  <span style={{ fontWeight: 600 }}>👤 Melhor do Jogador</span>
                  <strong style={{ color: theme.accent, fontSize: '1.1rem' }}>{userBestScore}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '6px', borderLeft: '4px solid #ff6b8a' }}>
                  <span style={{ fontWeight: 600 }}>🤖 Melhor da IA (Gemini)</span>
                  <strong style={{ color: '#ff6b8a', fontSize: '1.1rem' }}>{aiBestScore}</strong>
                </div>
              </div>
            </motion.section>

            {autoPlay && (
              <motion.section layout className="sidebar-section">
                <h2>Evolução e Sistema</h2>
                <div 
                  ref={evolutionTerminalRef}
                  style={{
                    background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 10, height: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: '0.75rem', border: `1px solid ${theme.accent}40`, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)', marginBottom: '15px'
                  }}
                >
                  {evolutionLogs.map(log => {
                    let color = '#fff';
                    if (log.type === 'error') color = '#ff6b8a';
                    if (log.type === 'success') color = '#6cf7d6';
                    if (log.type === 'gemini-thought') color = '#f7e06c'; 
                    return (
                      <div key={log.id} style={{ color }}>
                        <span style={{ opacity: 0.4 }}>[{log.time}]</span> {log.msg}
                      </div>
                    );
                  })}
                </div>

                <h2>Pensamentos (Tempo Real)</h2>
                <div 
                  ref={gameplayTerminalRef}
                  style={{
                    background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 10, height: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: '0.75rem', border: `1px solid ${theme.accent}40`, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
                  }}
                >
                  {gameplayLogs.map(log => {
                    let color = '#a1a1aa';
                    if (log.type === 'success') color = '#6cf7d6'; 
                    return (
                      <div key={log.id} style={{ color }}>
                        <span style={{ opacity: 0.4 }}>[{log.time}]</span> {log.msg}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            <motion.section layout className="sidebar-section">
              <h2>Controles</h2>
              <div className="control-row">
                <button className="action-button" type="button" onClick={startGame}>Start</button>
                <button className="chip-button" type="button" onClick={toggleFullscreen}>{isFullscreen ? 'Sair Fullscreen' : 'Tela cheia'}</button>
                <button className="chip-button" type="button" onClick={togglePause}>Pausar</button>
                <button className="chip-button" type="button" onClick={() => resetGame(boardSize)}>Reiniciar</button>
              </div>
            </motion.section>

            <motion.section layout className="sidebar-section">
              <h2>Modificadores</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: status !== 'ready' ? 'not-allowed' : 'pointer', opacity: status !== 'ready' ? 0.5 : 1 }}>
                  <input type="checkbox" checked={enablePowerups} onChange={(e) => setEnablePowerups(e.target.checked)} disabled={status !== 'ready'} style={{ accentColor: theme.accent }} />
                  <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Ativar Power-Ups</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: status !== 'ready' ? 'not-allowed' : 'pointer', opacity: status !== 'ready' ? 0.5 : 1 }}>
                  <input type="checkbox" checked={enableObstacles} onChange={(e) => setEnableObstacles(e.target.checked)} disabled={status !== 'ready'} style={{ accentColor: theme.accent }} />
                  <span style={{ fontSize: '0.9rem', color: '#ccc' }}>Ativar Paredes Dinâmicas</span>
                </label>
              </div>
            </motion.section>

            <motion.section layout className="sidebar-section">
              <h2>Dificuldade</h2>
              <div className="difficulty-grid">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.id} className="difficulty-option" type="button" data-active={item.id === difficultyId} onClick={() => handleDifficultyChange(item.id)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <span className="helper-text" style={{ display: 'block', marginTop: 4 }}>{item.note}</span>
                    </span>
                    <span className="kbd">{item.size}x{item.size}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section layout className="sidebar-section">
              <h2>Estilo</h2>
              <div className="theme-grid">
                {THEMES.map((item) => (
                  <button
                    key={item.id} className="theme-option" type="button" data-active={item.id === themeId} onClick={() => handleThemeChange(item.id)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <span className="helper-text" style={{ display: 'block', marginTop: 4 }}>{item.description}</span>
                    </span>
                    <span className="swatch" style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.accentStrong})` }} />
                  </button>
                ))}
              </div>
            </motion.section>
            
            <motion.section layout className="sidebar-section mobile-only-controls">
              <h2>Toque Rápido</h2>
              <div className="touch-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <button className="icon-button" type="button" onPointerDown={(e) => { e.preventDefault(); handleDirection(DIRECTIONS.ArrowUp); }}>
                  <ArrowIcon direction="up" />
                </button>
                <div className="touch-row" style={{ display: 'flex', gap: '8px' }}>
                  <button className="icon-button" type="button" onPointerDown={(e) => { e.preventDefault(); handleDirection(DIRECTIONS.ArrowLeft); }}>
                    <ArrowIcon direction="left" />
                  </button>
                  <button className="icon-button" type="button" onPointerDown={(e) => { e.preventDefault(); handleDirection(DIRECTIONS.ArrowDown); }}>
                    <ArrowIcon direction="down" />
                  </button>
                  <button className="icon-button" type="button" onPointerDown={(e) => { e.preventDefault(); handleDirection(DIRECTIONS.ArrowRight); }}>
                    <ArrowIcon direction="right" />
                  </button>
                </div>
              </div>
            </motion.section>

          </motion.aside>
        </motion.div>
      </motion.section>
    </main>
  );
}