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
  if (!DEBUG_SNAKE) {
    return;
  }

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

  if (!isCornerCell(boardSize, position)) {
    return position;
  }

  for (let x = 1; x < boardSize - 1; x += 1) {
    for (let y = 1; y < boardSize - 1; y += 1) {
      const candidate = { x, y };
      if (!snake.some((segment) => isSameCell(segment, candidate))) {
        return candidate;
      }
    }
  }

  return position;
}

function oppositeDirection(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
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
    direction.x === 1 && direction.y === 0
      ? 90
      : direction.x === -1 && direction.y === 0
      ? 270
      : direction.x === 0 && direction.y === 1
      ? 180
      : 0;

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
      <path
        d="M50 30c18 0 33 15 33 33S68 96 50 96 17 81 17 63s15-33 33-33z"
        fill={fill}
      />
      <path
        d="M50 30c18 0 33 15 33 33S68 96 50 96 17 81 17 63s15-33 33-33z"
        fill="rgba(255,255,255,0.16)"
      />
      <ellipse cx="41" cy="52" rx="9" ry="6" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

export default function SnakeGame() {
  const [autoPlay, setAutoPlay] = useState(false);
  const [difficultyId, setDifficultyId] = useState('normal');
  const [themeId, setThemeId] = useState('neon');
  // Snake, obstacles e powerups são mantidos em refs para performance
  const [snake, setSnake] = useState([]); // apenas para render
  const snakeRef = useRef([]);
  const [obstacles, setObstacles] = useState([]); // para render
  const obstaclesRef = useRef([]);
  const [powerups, setPowerups] = useState([]); // para render
  const powerupsRef = useRef([]);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState(null);
  const [food, setFood] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState('ready');
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

  useEffect(() => {
    const savedBest = Number(window.localStorage.getItem('snake-best-score') ?? 0);
    if (Number.isFinite(savedBest)) {
      setBestScore(savedBest);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('snake-best-score', String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    queuedDirectionRef.current = queuedDirection;
  }, [queuedDirection]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);


  // Sincroniza snakeRef com snake para renderização
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);
  useEffect(() => {
    powerupsRef.current = powerups;
  }, [powerups]);

  useEffect(() => {
    lastMoveRef.current = lastMove;
  }, [lastMove]);

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
      if (event.code === 'Space') {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.code === 'Enter') {
        event.preventDefault();
        if (status === 'gameover') {
          resetGame(boardSize);
          startGame();
        } else if (status === 'ready') {
          startGame();
        }
        return;
      }

      const isControlKey =
        event.code === 'Space' ||
        event.code === 'Enter' ||
        event.code.startsWith('Arrow') ||
        event.code === 'KeyW' ||
        event.code === 'KeyA' ||
        event.code === 'KeyS' ||
        event.code === 'KeyD';

      if (isControlKey) {
        event.preventDefault();
      }

      const next = directionFromKey(event.code);
      if (!next) {
        return;
      }

      handleDirection(next);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardSize, status]);

  // Game loop com requestAnimationFrame e deltaTime
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

  // Função principal do tick do jogo
  function runGameTick() {
    const currentSnake = snakeRef.current;
    if (currentSnake.length === 0) return;

    let nextDirection = queuedDirectionRef.current ?? directionRef.current;
    if (oppositeDirection(lastMoveRef.current, nextDirection)) {
      debugSnake('invalid-opposite-direction-dropped', {
        queuedDirection: queuedDirectionRef.current,
        lastMove: lastMoveRef.current,
      });
      nextDirection = directionRef.current;
      setQueuedDirection(null);
      queuedDirectionRef.current = null;
    }

    const head = currentSnake[0];
    const nextHead = {
      id: getNextSegmentId(),
      x: head.x + nextDirection.x,
      y: head.y + nextDirection.y,
    };

    // Obstáculo ou parede
    const hitWall =
      nextHead.x < 0 || nextHead.x >= boardSize || nextHead.y < 0 || nextHead.y >= boardSize;
    const hitObstacle = obstaclesRef.current.some((obs) => isSameCell(obs, nextHead));
    const ateFood = isSameCell(nextHead, foodRef.current);
    const powerupIdx = powerupsRef.current.findIndex((p) => isSameCell(p, nextHead));
    const tailWillStay = ateFood || growthRef.current > 0;
    const collisionSegments = tailWillStay ? currentSnake : currentSnake.slice(0, -1);
    const hitSelf = collisionSegments.some((segment) => isSameCell(segment, nextHead));

    // Power-up: intangível
    const intangible = powerupStateRef.current === 'intangivel' && powerupTimerRef.current > 0;

    if ((hitWall || hitObstacle) && !intangible) {
      debugSnake('gameover', {
        reason: hitObstacle ? 'obstacle' : 'wall',
        head: nextHead,
        lengthBeforeCrash: currentSnake.length,
        growthBuffer: growthRef.current,
      });
      setCrashType(hitObstacle ? 'obstacle' : 'wall');
      setStatus('gameover');
      return;
    }
    if (hitSelf) {
      debugSnake('gameover', {
        reason: 'self',
        head: nextHead,
        lengthBeforeCrash: currentSnake.length,
        growthBuffer: growthRef.current,
      });
      setCrashType('self');
      setStatus('gameover');
      return;
    }

    // Snake mutável para performance
    const nextSnake = currentSnake;
    nextSnake.unshift(nextHead);

    setDirection(nextDirection);
    directionRef.current = nextDirection;
    setLastMove(nextDirection);
    lastMoveRef.current = nextDirection;
    setQueuedDirection(null);
    queuedDirectionRef.current = null;
    setGlowPosition({
      x: ((nextHead.x + 0.5) / boardSize) * 100,
      y: ((nextHead.y + 0.5) / boardSize) * 100,
    });

    // Power-up
    if (powerupIdx !== -1) {
      const powerup = powerupsRef.current[powerupIdx];
      applyPowerup(powerup);
      powerupsRef.current.splice(powerupIdx, 1);
      setPowerups([...powerupsRef.current]);
    }

    // Comida normal
    if (ateFood) {
      growthRef.current += 1;
      debugSnake('ate-food', {
        head: nextHead,
        food: foodRef.current,
        lengthBeforeEat: currentSnake.length,
        growthBufferAfterIncrement: growthRef.current,
      });
      const points = difficulty.score;
      setScore((currentScore) => {
        const updatedScore = currentScore + points;
        setBestScore((currentBest) => Math.max(currentBest, updatedScore));
        return updatedScore;
      });
      const nextFood = createFood(boardSize, nextSnake);
      foodRef.current = nextFood;
      setFood(nextFood);
      setFoodSpawnId((currentId) => currentId + 1);
      setEatUntilMs(Date.now() + Math.max(260, difficulty.speed * 2.1));
      setEatEffect({ x: nextHead.x, y: nextHead.y, id: Date.now() });
      // Spawn powerup raro
      if (Math.random() < 0.08) spawnPowerup(boardSize, nextSnake);
      // Escalonar obstáculos
      if ((score + points) % 50 === 0) {
        spawnObstacle(boardSize, nextSnake);
      }
    }

    // Consome 1 unidade de crescimento pendente; se não houver, remove a cauda.
    if (growthRef.current > 0) {
      growthRef.current -= 1;
    } else {
      nextSnake.pop();
    }

    if (ateFood || nextSnake.length !== currentSnake.length) {
      debugSnake('tick-result', {
        ateFood,
        previousLength: currentSnake.length,
        nextLength: nextSnake.length,
        growthBufferAfterTick: growthRef.current,
        head: nextHead,
      });
    }

    // Sincroniza snake para render
    setSnake([...nextSnake]);
  }

  // Power-up state
  const powerupStateRef = useRef(null); // 'intangivel', 'shrink', 'bonus'
  const powerupTimerRef = useRef(0);
  function applyPowerup(powerup) {
    if (powerup.type === 'bonus') {
      setScore((s) => s + 50);
    } else if (powerup.type === 'shrink') {
      // Remove 2 segmentos se possível
      for (let i = 0; i < 2; i++) {
        if (snakeRef.current.length > 1) snakeRef.current.pop();
      }
    } else if (powerup.type === 'intangivel') {
      powerupStateRef.current = 'intangivel';
      powerupTimerRef.current = 60; // ~3s se tick 50ms
      // Timer decrescente
      const timer = setInterval(() => {
        powerupTimerRef.current -= 1;
        if (powerupTimerRef.current <= 0) {
          powerupStateRef.current = null;
          clearInterval(timer);
        }
      }, difficulty.speed);
    }
  }

  // Spawn procedural de obstáculos
  function spawnObstacle(boardSize, snake) {
    // Gera um obstáculo no centro expandindo
    const center = Math.floor(boardSize / 2);
    const size = 2 + Math.floor(score / 100);
    const newObstacles = [];
    for (let i = -size; i <= size; i++) {
      newObstacles.push({ x: center + i, y: center });
      newObstacles.push({ x: center, y: center + i });
    }
    // Não sobrescreve snake/food
    const filtered = newObstacles.filter(
      (obs) =>
        !snake.some((s) => isSameCell(s, obs)) &&
        !isSameCell(obs, foodRef.current)
    );
    obstaclesRef.current = [...obstaclesRef.current, ...filtered];
    setObstacles([...obstaclesRef.current]);
  }

  // Spawn procedural de powerup
  function spawnPowerup(boardSize, snake) {
    const types = ['bonus', 'shrink', 'intangivel'];
    const type = types[Math.floor(Math.random() * types.length)];
    let pos;
    let attempts = 0;
    do {
      pos = { x: getRandomInt(boardSize), y: getRandomInt(boardSize) };
      attempts++;
    } while (
      (snake.some((s) => isSameCell(s, pos)) ||
        obstaclesRef.current.some((o) => isSameCell(o, pos)) ||
        isSameCell(pos, foodRef.current)) &&
      attempts < 100
    );
    if (attempts < 100) {
      const powerup = { ...pos, type, id: Date.now() + Math.random() };
      powerupsRef.current.push(powerup);
      setPowerups([...powerupsRef.current]);
      // Remove após 5s
      setTimeout(() => {
        powerupsRef.current = powerupsRef.current.filter((p) => p.id !== powerup.id);
        setPowerups([...powerupsRef.current]);
      }, 5000);
    }
  }

  useEffect(() => {
    if (status === 'running' || status === 'gameover') {
      return;
    }

    const centered = { x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) };
    setGlowPosition({
      x: ((centered.x + 0.5) / boardSize) * 100,
      y: ((centered.y + 0.5) / boardSize) * 100,
    });
  }, [boardSize, status]);

  function resetGame(nextBoardSize = boardSize) {
    const startingSnakeCells = createSnake(nextBoardSize);
    const startingSnake = startingSnakeCells.map((segment) => ({
      id: getNextSegmentId(),
      x: segment.x,
      y: segment.y,
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
    setFoodSpawnId((currentId) => currentId + 1);
    setEatUntilMs(0);
    setEatEffect(null);
    setGlowPosition({
      x: ((startingSnake[0].x + 0.5) / nextBoardSize) * 100,
      y: ((startingSnake[0].y + 0.5) / nextBoardSize) * 100,
    });
    // Reset obstacles e powerups
    obstaclesRef.current = [];
    setObstacles([]);
    powerupsRef.current = [];
    setPowerups([]);
    powerupStateRef.current = null;
    powerupTimerRef.current = 0;

    debugSnake('reset-game', {
      boardSize: nextBoardSize,
      startingLength: startingSnake.length,
      startingHead: startingSnake[0],
      startingFood,
      growthBufferAfterReset: growthRef.current,
    });
  }

  function startGame() {
    if (status === 'gameover') {
      resetGame(boardSize);
    }

    setStatus('running');
  }

  function togglePause() {
    setStatus((currentStatus) => {
      if (currentStatus === 'running') {
        return 'paused';
      }

      if (currentStatus === 'paused') {
        return 'running';
      }

      if (currentStatus === 'ready') {
        return 'running';
      }

      return currentStatus;
    });
  }

  function handleThemeChange(nextThemeId) {
    setThemeId(nextThemeId);
  }

  function handleDifficultyChange(nextDifficultyId) {
    setDifficultyId(nextDifficultyId);
    setStatus('ready');
  }

  function handleDirection(nextDirection) {
    setQueuedDirection((current) => {
      const movingDirection = lastMoveRef.current;
      if (oppositeDirection(movingDirection, nextDirection)) {
        debugSnake('ignored-opposite-input', {
          attempted: nextDirection,
          movingDirection,
          queuedDirection: current,
        });
        queuedDirectionRef.current = current;
        return current;
      }

      queuedDirectionRef.current = nextDirection;
      return nextDirection;
    });
  }

  async function toggleFullscreen() {
    if (!shellRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await shellRef.current.requestFullscreen();
  }

  const boardStyle = {
    '--accent': theme.accent,
    '--accent-strong': theme.accentStrong,
    '--board-bg': theme.board,
    '--grid-size': `${100 / boardSize}%`,
    '--glow-x': `${glowPosition.x}%`,
    '--glow-y': `${glowPosition.y}%`,
  };

  return (
    <main className="app-shell" style={boardStyle} ref={shellRef} data-fullscreen={isFullscreen ? 'true' : 'false'}>
      <div className="noise" />

      <section className="hero">
        <div className="hero-copy">
          <div>
            <span className="eyebrow">Snake Motion</span>
            <h1>Uma cobrinha com ritmo, cor e tensão real.</h1>
          </div>

          <div className="hero-meta">
            <div className="pill-row">
              <span className="pill">{difficulty.label}</span>
              <span className="pill">{theme.label}</span>
              <span className="pill">React + Next.js</span>
              <span className="pill">Framer Motion</span>
            </div>
            <p>
              Jogue com setas ou WASD, alterne entre estilos visuais e suba a dificuldade sem sair da página.
              O tabuleiro reage com animações suaves e feedback imediato.
            </p>
          </div>
        </div>

        <div className="game-shell">
          <div className="panel board-panel">
            <div className="hud-row" style={{ alignItems: 'center' }}>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>Pontuação</span>
                <strong>{score}</strong>
              </div>
              <div className="hud-card" style={{ minWidth: 90 }}>
                <span>Melhor</span>
                <strong>{bestScore}</strong>
              </div>
              <div className="hud-card" style={{ minWidth: 90 }}>
                              <button
                                className="chip-button"
                                style={{ marginLeft: 12, fontWeight: autoPlay ? 700 : 400, background: autoPlay ? '#6cf7d6' : undefined }}
                                onClick={() => setAutoPlay((v) => !v)}
                              >
                                {autoPlay ? 'Auto-Play: ON' : 'Auto-Play'}
                              </button>
                <span>Status</span>
                <strong>
                  {status === 'ready'
                    ? 'Pronto'
                    : status === 'running'
                    ? 'Correndo'
                    : status === 'paused'
                    ? 'Pausado'
                    : 'Fim de jogo'}
                </strong>
              </div>
            </div>

            <motion.div
              className="board-frame"
              animate={
                status === 'gameover' && crashType === 'self'
                  ? {
                      x: [0, -9, 9, -7, 7, -4, 4, 0],
                      rotate: [0, -0.8, 0.8, -0.4, 0.4, 0],
                    }
                  : { x: 0, rotate: 0 }
              }
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              <div className="board-grid" />
              <motion.div
                className="board-glow"
                animate={{ opacity: status === 'running' ? 0.8 : 0.55 }}
                transition={{ duration: 0.9 }}
              />

              <div className="board-content">
                {snake.map((segment, index) => {
                  const size = 100 / boardSize;
                  return (
                    <motion.div
                      key={segment.id}
                      className="snake-segment"
                      initial={false}
                      animate={{
                        opacity: 1,
                        scale: index === 0 ? (isEating ? 1.2 : 1.08) : 1,
                        left: `${segment.x * size}%`,
                        top: `${segment.y * size}%`,
                        width: `${size}%`,
                        height: `${size}%`,
                      }}
                      transition={{ type: 'tween', duration: segmentTravelDuration, ease: 'linear' }}
                      style={{
                        width: `${size}%`,
                        height: `${size}%`,
                        zIndex: 2,
                      }}
                    >
                      <SnakeSegmentSvg
                        isHead={index === 0}
                        fill={index === 0 ? theme.snakeHead : theme.snakeBody}
                        direction={lastMove}
                        isEating={index === 0 && isEating}
                      />
                    </motion.div>
                  );
                })}
                {/* Obstáculos */}
                {obstacles.map((obs, i) => {
                  const size = 100 / boardSize;
                  return (
                    <motion.div
                      key={`obs-${obs.x}-${obs.y}`}
                      className="obstacle-piece"
                      initial={false}
                      animate={{
                        left: `${obs.x * size}%`,
                        top: `${obs.y * size}%`,
                        width: `${size}%`,
                        height: `${size}%`,
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{ type: 'tween', duration: 0.18, ease: 'linear' }}
                      style={{
                        width: `${size}%`,
                        height: `${size}%`,
                        background: 'linear-gradient(135deg, #222 60%, #444 100%)',
                        borderRadius: '18%',
                        border: '2px solid #333',
                        zIndex: 1,
                        boxShadow: '0 0 12px #0008',
                      }}
                    />
                  );
                })}
                {/* Power-ups */}
                {powerups.map((p) => {
                  const size = 100 / boardSize;
                  let color = '#f7e06c';
                  if (p.type === 'shrink') color = '#6cf7d6';
                  if (p.type === 'intangivel') color = '#ff6b8a';
                  return (
                    <motion.div
                      key={p.id}
                      className="powerup-piece"
                      initial={false}
                      animate={{
                        left: `${p.x * size}%`,
                        top: `${p.y * size}%`,
                        width: `${size}%`,
                        height: `${size}%`,
                        opacity: 1,
                        scale: [1, 1.18, 1],
                        rotate: [0, 12, 0],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        width: `${size}%`,
                        height: `${size}%`,
                        zIndex: 3,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        {p.type === 'bonus' && (
                          <circle cx="50" cy="50" r="36" fill={color} stroke="#fff" strokeWidth="6" />
                        )}
                        {p.type === 'shrink' && (
                          <rect x="18" y="18" width="64" height="64" rx="18" fill={color} stroke="#fff" strokeWidth="6" />
                        )}
                        {p.type === 'intangivel' && (
                          <polygon points="50,10 90,90 10,90" fill={color} stroke="#fff" strokeWidth="6" />
                        )}
                      </svg>
                    </motion.div>
                  );
                })}

                <motion.div
                  className="food-piece"
                  animate={{
                    left: `${food.x * (100 / boardSize)}%`,
                    top: `${food.y * (100 / boardSize)}%`,
                    width: `${100 / boardSize}%`,
                    height: `${100 / boardSize}%`,
                  }}
                  transition={{ type: 'tween', duration: 0.28, ease: 'easeInOut' }}
                  style={{
                    width: `${100 / boardSize}%`,
                    height: `${100 / boardSize}%`,
                    boxShadow: `0 0 28px color-mix(in srgb, ${theme.food} 55%, transparent)`,
                  }}
                >
                  <motion.div
                    key={foodSpawnId}
                    className="food-pulse"
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
                    transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                  >
                    <FoodSvg fill={theme.food} />
                  </motion.div>
                </motion.div>

                <AnimatePresence>
                  {eatEffect && (
                    <motion.div
                      key={eatEffect.id}
                      className="eat-burst"
                      initial={{ opacity: 0.85, scale: 0.4 }}
                      animate={{ opacity: 0, scale: 1.35 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      style={{
                        left: `${eatEffect.x * (100 / boardSize)}%`,
                        top: `${eatEffect.y * (100 / boardSize)}%`,
                        width: `${100 / boardSize}%`,
                        height: `${100 / boardSize}%`,
                        color: theme.food,
                      }}
                      onAnimationComplete={() => {
                        setEatEffect((current) => (current?.id === eatEffect.id ? null : current));
                      }}
                    >
                      <svg className="eat-burst-svg" viewBox="0 0 100 100" aria-hidden="true">
                        <path
                          d="M50 6l10 24 26 2-20 16 6 25-22-14-22 14 6-25-20-16 26-2z"
                          fill="currentColor"
                          fillOpacity="0.9"
                        />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {(status === 'ready' || status === 'paused' || status === 'gameover') && (
                  <motion.div
                    className="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="overlay-card"
                      initial={{ y: 20, scale: 0.96 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={{ y: 10, scale: 0.98 }}
                    >
                      <h3>
                        {status === 'gameover'
                          ? 'Fim de jogo'
                          : status === 'paused'
                          ? 'Jogo pausado'
                          : 'Pronto para começar'}
                      </h3>
                      <p>
                        {status === 'gameover'
                          ? crashType === 'self'
                            ? 'A cobrinha bateu nela mesma. Respire e tente outra rota.'
                            : 'Reinicie para tentar superar sua melhor pontuação.'
                          : 'Pressione Enter para iniciar, ou use o botão de ação ao lado.'}
                      </p>
                      <div className="control-row" style={{ justifyContent: 'center' }}>
                        <button
                          className="action-button"
                          type="button"
                          onClick={() => {
                            if (status === 'gameover') {
                              resetGame(boardSize);
                            }
                            startGame();
                          }}
                        >
                          {status === 'gameover' ? 'Jogar novamente' : 'Iniciar'}
                        </button>
                        {status !== 'ready' && (
                          <button className="chip-button" type="button" onClick={togglePause}>
                            {status === 'paused' ? 'Retomar' : 'Pausar'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <aside className="panel sidebar">
            <section className="sidebar-section">
              <h2>Controles</h2>
              <div className="control-row">
                <button className="action-button" type="button" onClick={startGame}>
                  Start
                </button>
                <button className="chip-button" type="button" onClick={toggleFullscreen}>
                  {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                </button>
                <button className="chip-button" type="button" onClick={togglePause}>
                  Pausar / Retomar
                </button>
                <button
                  className="chip-button"
                  type="button"
                  onClick={() => {
                    resetGame(boardSize);
                  }}
                >
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

            <section className="sidebar-section">
              <h2>Gestos rápidos</h2>
              <ul className="hint-list">
                <li>
                  <strong>Movimento</strong>
                  <span>Setas ou WASD</span>
                </li>
                <li>
                  <strong>Pausar</strong>
                  <span>Espaço</span>
                </li>
                <li>
                  <strong>Iniciar</strong>
                  <span>Enter</span>
                </li>
              </ul>
            </section>

            <section className="sidebar-section">
              <h2>Toque</h2>
              <div className="touch-controls">
                <button className="icon-button" type="button" onClick={() => handleDirection(DIRECTIONS.ArrowUp)}>
                  <ArrowIcon direction="up" />
                </button>
                <div className="touch-row">
                  <button className="icon-button" type="button" onClick={() => handleDirection(DIRECTIONS.ArrowLeft)}>
                    <ArrowIcon direction="left" />
                  </button>
                  <button className="icon-button" type="button" onClick={() => handleDirection(DIRECTIONS.ArrowDown)}>
                    <ArrowIcon direction="down" />
                  </button>
                  <button className="icon-button" type="button" onClick={() => handleDirection(DIRECTIONS.ArrowRight)}>
                    <ArrowIcon direction="right" />
                  </button>
                </div>
              </div>
            </section>

            <div className="footer-note">
              O tabuleiro foi desenhado para evoluir com a dificuldade e mudar de personalidade com cada tema.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}