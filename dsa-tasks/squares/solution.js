function run() {
  const inputText = document.getElementById("input").value.trim();
  const input = inputText.split(/\s+/);

  let idx = 0;
  let next = () => input[idx++];
  let nextInt = () => Number(next());

  const n = nextInt();
  const size = n * n;

  const { grid, symbols } = readGrid(next, size);
  const { rows, cols, boxes } = initializeSets(grid, n, size);

  solveSudoku(grid, rows, cols, boxes, symbols, n, size);

  display(grid, size);
}

function readGrid(next, size) {
  let grid = [];
  let symbols = new Set();

  for (let i = 0; i < size; i++) {
    let row = [];
    for (let j = 0; j < size; j++) {
      const s = next();
      row.push(s);
      if (s !== "0") symbols.add(s);
    }
    grid.push(row);
  }

  return { grid, symbols };
}

function initializeSets(grid, n, size) {
  let rows = Array.from({ length: size }, () => new Set());
  let cols = Array.from({ length: size }, () => new Set());
  let boxes = Array.from({ length: size }, () => new Set());

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const val = grid[i][j];
      if (val !== "0") {
        rows[i].add(val);
        cols[j].add(val);
        let boxIndex = Math.floor(i / n) * n + Math.floor(j / n);
        boxes[boxIndex].add(val);
      }
    }
  }

  return { rows, cols, boxes };
}

function solveSudoku(grid, rows, cols, boxes, symbols, n, size, i = 0, j = 0) {
  if (i === size) return true;

  let ni = i, nj = j + 1;
  if (j === size - 1) {
    ni = i + 1;
    nj = 0;
  }

  if (grid[i][j] !== "0")
    return solveSudoku(grid, rows, cols, boxes, symbols, n, size, ni, nj);

  let boxIndex = Math.floor(i / n) * n + Math.floor(j / n);

  for (const sym of symbols) {
    if (!rows[i].has(sym) && !cols[j].has(sym) && !boxes[boxIndex].has(sym)) {
      grid[i][j] = sym;
      rows[i].add(sym);
      cols[j].add(sym);
      boxes[boxIndex].add(sym);

      if (solveSudoku(grid, rows, cols, boxes, symbols, n, size, ni, nj))
        return true;

      grid[i][j] = "0";
      rows[i].delete(sym);
      cols[j].delete(sym);
      boxes[boxIndex].delete(sym);
    }
  }

  return false;
}

function display(grid, size) {
  const outputText = grid.map(r => r.join(" ")).join("\n");
  document.getElementById("output").value =
    `${size} x ${size}\n` + outputText;
}
