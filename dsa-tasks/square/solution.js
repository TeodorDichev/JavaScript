function computeDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function findValidEndpoints(a) {
  const endpoints = [];
  const lengths = new Set();

  for (let x = 1; x <= a; x++) {
    for (let y = 1; y <= a; y++) {
      const d = computeDistance(0, 0, x, y);
      if (Number.isInteger(d)) {
        endpoints.push({ x, y });
        lengths.add(d);
      }
    }
  }

  return {
    endpoints,
    lengths,
    longest: Math.max(...lengths, 0)
  };
}

function drawGrid(ctx, a, squareSize) {
  for (let i = 0; i <= a; i++) {
    ctx.fillRect(i * squareSize, 0, 2, a * squareSize + 2);
    ctx.fillRect(0, i * squareSize, a * squareSize + 2, 2);
  }
}

function drawLines(ctx, endpoints, squareSize, longest) {
  for (const p of endpoints) {
    const d = computeDistance(0, 0, p.x, p.y);
    ctx.strokeStyle = d === longest ? "Green" : "Red";

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(p.x * squareSize, p.y * squareSize);
    ctx.stroke();
  }
}

function drawCanvas(a, endpoints, longest) {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  const squareSize = a > 64 ? 8 : 16;
  canvas.width = a * squareSize + 2;
  canvas.height = a * squareSize + 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid(ctx, a, squareSize);
  drawLines(ctx, endpoints, squareSize, longest);
}

document.getElementById("submit").addEventListener("click", () => {
  const a = Number(document.getElementById("a").value);

  if (a <= 0 || a >= 20000) {
    alert("A out of range");
    return;
  }

  const { endpoints, lengths, longest } = findValidEndpoints(a);
  document.getElementById("longestLine").value = longest;
  document.getElementById("sizesCount").value = lengths.size;
  drawCanvas(a, endpoints, longest);
});
