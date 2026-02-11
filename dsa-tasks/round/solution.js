// GLOBAL DRAW MODE
let drawMode = "points";
let nodes = []

function computeDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

class CircleNode {
  constructor(index, x, y, r) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.r = r;
    this.neighbors = [];
    this.dist = -1;
  }
}

function buildGraph(nodes) {
  const n = nodes.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const c1 = nodes[i];
      const c2 = nodes[j];

      const d = computeDistance(c1.x, c1.y, c2.x, c2.y);
      const rsum = c1.r + c2.r;
      const rdiff = Math.abs(c1.r - c2.r);

      if (d > rdiff && d < rsum) {
        c1.neighbors.push(c2);
        c2.neighbors.push(c1);
      }
    }
  }
}

function bfs(nodes) {
  const start = nodes[0];
  const target = nodes[nodes.length - 1];

  const queue = [];
  start.dist = 0;
  queue.push(start);

  while (queue.length > 0) {
    const node = queue.shift();

    if (node === target) return node.dist;

    for (const nb of node.neighbors) {
      if (nb.dist === -1) {
        nb.dist = node.dist + 1;
        queue.push(nb);
      }
    }
  }
  return -1;
}

function drawGraph(nodes) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, width, height);

  const n = nodes.length;
  const positions = new Array(n);

    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.4;

    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      positions[i] = {
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle)
      };
    }

  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;

  for (let i = 0; i < n; i++) {
    for (const nb of nodes[i].neighbors) {
      const j = nb.index - 1;
      if (j > i) {
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[j].x, positions[j].y);
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const pos = positions[i];

    ctx.fillStyle = "#0033aa";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    const text = "A" + nodes[i].index + ": " + nodes[i].dist;
    ctx.fillText(text, pos.x + 6, pos.y - 6);
  }
}

function drawCircles(nodes) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, width, height);

  if (nodes.length === 0) return;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.r);
    maxX = Math.max(maxX, n.x + n.r);
    minY = Math.min(minY, n.y - n.r);
    maxY = Math.max(maxY, n.y + n.r);
  }

  const padding = 40;
  const scaleX = (width - 2 * padding) / (maxX - minX);
  const scaleY = (height - 2 * padding) / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  function toCanvas(x, y) {
    return {
      x: padding + (x - minX) * scale,
      y: height - (padding + (y - minY) * scale)
    };
  }

  for (const n of nodes) {
    const p = toCanvas(n.x, n.y);
    const r = n.r * scale;

    ctx.strokeStyle = "#0033aa";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#0033aa";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "A" + n.index + ": " + n.dist,
      p.x + 5,
      p.y - 5
    );
  }
}


document.getElementById("run").onclick = function () {
  const raw = document.getElementById("input").value.trim().split(/\s+/);

  if (raw.length < 4) {
    document.getElementById("result").textContent = "Invalid input.";
    return;
  }

  let idx = 0;
  const n = Number(raw[idx++]);
  nodes = [];

  for (let i = 0; i < n; i++) {
    const x = Number(raw[idx++]);
    const y = Number(raw[idx++]);
    const r = Number(raw[idx++]);
    nodes.push(new CircleNode(i + 1, x, y, r));
  }

  buildGraph(nodes);
  const result = bfs(nodes);

  document.getElementById("result").textContent =
    "Shortest path length: " + result;

  drawGraph(nodes);
};

document.getElementById("toggle").onclick = function () {
  drawMode = drawMode === "points" ? "circles" : "points";
  
  if (drawMode === "points")
    drawGraph(nodes);
  else if (drawMode === "circles")
    drawCircles(nodes);
};
