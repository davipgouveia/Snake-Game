// utils/SnakeAI.js

// Verifica se a posição bate na parede ou no próprio corpo
const isSafe = (x, y, snake, gridSize) => {
  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
  // Ignora o rabo, pois ele vai se mover no próximo turno
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === x && snake[i].y === y) return false;
  }
  return true;
};

// Algoritmo de Flood Fill (Busca em Largura - BFS) para contar espaços livres
const countFreeSpace = (startX, startY, snake, gridSize, maxSearch) => {
  let queue = [{ x: startX, y: startY }];
  let visited = new Set([`${startX},${startY}`]);
  let freeSpaces = 0;

  while (queue.length > 0 && freeSpaces < maxSearch) {
    let curr = queue.shift();
    freeSpaces++;

    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    for (let dir of directions) {
      let nx = curr.x + dir.dx;
      let ny = curr.y + dir.dy;
      let key = `${nx},${ny}`;

      if (!visited.has(key) && isSafe(nx, ny, snake, gridSize)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return freeSpaces;
};

// Função principal exportada para o componente
export const getNextMove = (snake, food, gridSize) => {
  const head = snake[0];
  const possibleMoves = [
    { dir: 'UP', x: head.x, y: head.y - 1 },
    { dir: 'DOWN', x: head.x, y: head.y + 1 },
    { dir: 'LEFT', x: head.x - 1, y: head.y },
    { dir: 'RIGHT', x: head.x + 1, y: head.y }
  ];

  // 1. Filtra movimentos que causam morte instantânea
  let safeMoves = possibleMoves.filter(move => isSafe(move.x, move.y, snake, gridSize));

  if (safeMoves.length === 0) return null; // Game Over inevitável

  // 2. Verifica o espaço livre (Flood Fill) para cada movimento seguro
  // O maxSearch é o tamanho da cobra. Se tivermos espaço >= tamanho da cobra, estamos seguros.
  safeMoves = safeMoves.map(move => {
    const space = countFreeSpace(move.x, move.y, snake, gridSize, snake.length + 5);
    return { ...move, space };
  });

  // 3. Filtra apenas os caminhos que não são becos sem saída
  let viableMoves = safeMoves.filter(move => move.space >= snake.length);

  // MODO SOBREVIVÊNCIA: Se todos os caminhos levam a um beco, escolhe o que demora mais para morrer
  if (viableMoves.length === 0) {
    viableMoves = [safeMoves.sort((a, b) => b.space - a.space)[0]];
  }

  // 4. MODO CAÇA (Greedy): Entre os caminhos viáveis, escolhe o mais perto da comida (Manhattan Distance)
  viableMoves.sort((a, b) => {
    const distA = Math.abs(a.x - food.x) + Math.abs(a.y - food.y);
    const distB = Math.abs(b.x - food.x) + Math.abs(b.y - food.y);
    return distA - distB;
  });

  return viableMoves[0].dir;
};