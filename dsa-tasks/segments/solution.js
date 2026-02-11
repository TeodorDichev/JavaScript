function run() {
  const n = Number(document.getElementById("n").value);
  const a = Number(document.getElementById("a").value);
  const b = Number(document.getElementById("b").value);
  const c = Number(document.getElementById("c").value);

  const colored = Array(n).fill(false);
  const aPoints = [];
  const bPoints = [];

  // Compute red segments and points
  for (let pA = 0; pA <= n; pA += a) {
    aPoints.push(pA);
    for (let pB = n; pB >= 0; pB -= b) {
      if (Math.abs(pA - pB) === c) {
        bPoints.push(pB);

        const start = Math.min(pA, pB);
        const end = start + c;
        for (let i = start; i < end; i++) {
          colored[i] = true;
        }
      }
    }
  }

  draw(colored, aPoints, bPoints, n)
}

function draw(colored, aPoints, bPoints, n) {
  const uncolored = colored.reduce((acc, x) => acc + (!x ? 1 : 0), 0);
  document.getElementById("uncolored").textContent = uncolored;

  // Draw visualization
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let scale = canvas.width / n;
  if (scale < 1) scale = 1;
  canvas.width =
    Math.ceil(n * scale) > window.innerWidth
      ? window.innerWidth
      : Math.ceil(n * scale);

  // Draw red/gray segments
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colored[i] ? "red" : "lightgray";
    ctx.fillRect(i * scale, 20, scale, 20);
  }

  // Draw Georgi's points (blue dots)
  ctx.fillStyle = "blue";
  for (const p of aPoints) {
    ctx.beginPath();
    ctx.arc(p * scale, 15, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw Gergana's points (green dots)
  ctx.fillStyle = "green";
  for (const p of bPoints) {
    ctx.beginPath();
    ctx.arc(p * scale, 45, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw start/end vertical lines
  ctx.fillStyle = "black";
  ctx.fillRect(0, 20, 2, 20);
  ctx.fillRect(canvas.width - 2, 20, 2, 20);
}
