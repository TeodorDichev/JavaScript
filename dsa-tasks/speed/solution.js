class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n + 1 }, (_, i) => i);
  }

  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a, b) {
    this.parent[this.find(a)] = this.find(b);
  }

  allConnected(n) {
    const root = this.find(1);
    for (let i = 2; i <= n; i++) {
      if (this.find(i) !== root) return false;
    }
    return true;
  }

  reset() {
    for (let i = 0; i < this.parent.length; i++) this.parent[i] = i;
  }
}

function findOptimalSpeeds(N, edges) {
  edges.sort((a, b) => a.speed - b.speed);

  let bestMin = -1, bestMax = -1, bestDiff = Infinity;
  const M = edges.length;
  const dsu = new UnionFind(N);

  for (let left = 0; left < M; left++) {
    dsu.reset();
    let right = left;

    while (right < M) {
      dsu.union(edges[right].from, edges[right].to);
      if (dsu.allConnected(N)) break;
      right++;
    }

    if (right === M) break;

    const minSpeed = edges[left].speed;
    const maxSpeed = edges[right].speed;
    const diff = maxSpeed - minSpeed;

    if (
      diff < bestDiff ||
      (diff === bestDiff && minSpeed < bestMin) ||
      (diff === bestDiff && minSpeed === bestMin && maxSpeed < bestMax)
    ) {
      bestDiff = diff;
      bestMin = minSpeed;
      bestMax = maxSpeed;
    }
  }

  return [bestMin, bestMax];
}

function drawGraph(N, edges, minSpeed, maxSpeed) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, width, height);

  // Позиции на градовете
  const positions = [];
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.4;

  for (let i = 0; i < N; i++) {
    const angle = (2 * Math.PI * i) / N;
    positions[i] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  }

  // Групиране на ребрата по двойка върхове
  const edgeMap = new Map();
  for (const e of edges) {
    const key = e.from < e.to ? `${e.from},${e.to}` : `${e.to},${e.from}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key).push(e.speed);
  }

  ctx.lineWidth = 2;
  ctx.font = "12px sans-serif";

  edgeMap.forEach((speeds, key) => {
    const [u, v] = key.split(",").map(Number);
    const p1 = positions[u - 1];
    const p2 = positions[v - 1];

    // Ако поне една от скоростите е в интервала → червено, иначе сиво
    const highlight = speeds.some(s => s >= minSpeed && s <= maxSpeed);
    ctx.strokeStyle = highlight ? "red" : "#888";
    ctx.fillStyle = "#000";

    // линия
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // тежести
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    ctx.fillText(speeds.join(","), midX + 3, midY - 3);
  });

  // Рисуваме градовете
  for (let i = 0; i < N; i++) {
    const pos = positions[i];
    ctx.fillStyle = "#0033aa";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.fillText(`${i + 1}`, pos.x + 8, pos.y - 8);
  }
}

document.getElementById("run").onclick = function () {
  const raw = document.getElementById("input").value.trim().split(/\s+/);
  if (raw.length < 3) {
    document.getElementById("result").textContent = "Invalid input.";
    return;
  }

  let idx = 0;
  const n = Number(raw[idx++]);
  const m = Number(raw[idx++]);
  const edges = [];

  for (let i = 0; i < m; i++) {
    const from = Number(raw[idx++]);
    const to = Number(raw[idx++]);
    const speed = Number(raw[idx++]);
    edges.push({ from, to, speed });
  }

  const [minSpeed, maxSpeed] = findOptimalSpeeds(n, edges);
  document.getElementById("result").textContent = `Min speed: ${minSpeed}, Max speed: ${maxSpeed}`;
  drawGraph(n, edges, minSpeed, maxSpeed);
};
