/**
 * solver.js — Mathdoku (KenKen) Solver + Rater
 * Usage: <script src="solver.js"></script>
 *
 * API:
 *   MathdokuSolver.solve(puzzle)   → { grid, solutions } or null
 *   MathdokuSolver.rate(puzzle)    → { difficulty, score, breakdown }
 *
 * Puzzle format:
 *   {
 *     size: 4,           // grid is size×size
 *     cages: [
 *       { cells: [[0,0],[0,1]], op: '+', target: 5 },
 *       ...
 *     ],
 *     givens: [          // optional pre-filled cells
 *       { row: 0, col: 2, value: 3 },
 *       ...
 *     ]
 *   }
 *
 * Ops: '+', '-', '*', '/'
 * Cells: [row, col], zero-indexed
 */

(function (global) {
  "use strict";

  // ─── Cage constraint checker ─────────────────────────────────────────────

  function checkCage(values, op, target) {
    if (values.length === 0) return false;
    switch (op) {
      case "=": return values.length === 1 && values[0] === target;
      case "+": return values.reduce((a, b) => a + b, 0) === target;
      case "*": return values.reduce((a, b) => a * b, 1) === target;
      case "-": {
        // any permutation of two values
        if (values.length !== 2) return false;
        return Math.abs(values[0] - values[1]) === target;
      }
      case "/": {
        if (values.length !== 2) return false;
        const [a, b] = values;
        return (a / b === target) || (b / a === target);
      }
    }
    return false;
  }

  function partialCageOk(values, op, target, size) {
    if (values.length === 0) return true;
    switch (op) {
      case "=": return values[0] === target;
      case "+": return values.reduce((a, b) => a + b, 0) <= target;
      case "*": return values.reduce((a, b) => a * b, 1) <= target;
      case "-": return true; // hard to prune early
      case "/": return true;
    }
    return true;
  }

  // ─── Solver core (backtracking) ───────────────────────────────────────────

  function solve(puzzle, opts) {
    opts = opts || {};
    const maxSolutions = opts.maxSolutions || 2; // stop after 2 to detect uniqueness
    const { size, cages } = puzzle;

    // Map each cell to its cage index
    const cellToCage = [];
    for (let r = 0; r < size; r++) {
      cellToCage.push(new Array(size).fill(-1));
    }
    cages.forEach((cage, ci) => {
      cage.cells.forEach(([r, c]) => (cellToCage[r][c] = ci));
    });
    // Uncaged cells: -1, skip cage elimination for those
    // Cells not in any cage are free (latin square only, no cage constraint)

    // grid: 0 = empty
    const grid = [];
    for (let r = 0; r < size; r++) grid.push(new Array(size).fill(0));

    // Track cage fill progress
    const cageFilled = cages.map(() => []);

    const solutions = [];

    function bt(pos) {
      if (solutions.length >= maxSolutions) return;
      if (pos === size * size) {        // Verify all cages
        for (let ci = 0; ci < cages.length; ci++) {
          const cage = cages[ci];
          if (!checkCage(cageFilled[ci], cage.op, cage.target)) return;
        }
        solutions.push(grid.map(r => r.slice()));
        return;
      }

      const row = Math.floor(pos / size);
      const col = pos % size;

      // Skip givens — already filled, just move on
      if (givenSet.has(pos)) {
        bt(pos + 1);
        return;
      }

      const ci = cellToCage[row][col];

      // Uncaged cell: only latin square applies, no cage check needed
      if (ci === -1) {
        for (let v = 1; v <= size; v++) {
          let ok = true;
          for (let c = 0; c < col; c++) if (grid[row][c] === v) { ok = false; break; }
          if (ok) for (let r = 0; r < row; r++) if (grid[r][col] === v) { ok = false; break; }
          if (!ok) continue;
          grid[row][col] = v;
          bt(pos + 1);
          grid[row][col] = 0;
          if (solutions.length >= maxSolutions) return;
        }
        return;
      }
      const cage = cages[ci];

      for (let v = 1; v <= size; v++) {
        // Latin square check: no duplicate in row/col
        let ok = true;
        for (let c = 0; c < col; c++) if (grid[row][c] === v) { ok = false; break; }
        if (ok) for (let r = 0; r < row; r++) if (grid[r][col] === v) { ok = false; break; }
        if (!ok) continue;

        // Partial cage pruning
        const filled = cageFilled[ci];
        filled.push(v);
        const partial = filled.length < cage.cells.length
          ? partialCageOk(filled, cage.op, cage.target, size)
          : checkCage(filled, cage.op, cage.target);

        if (partial) {
          grid[row][col] = v;
          bt(pos + 1);
        }
        filled.pop();
        if (solutions.length >= maxSolutions) return;
      }
      grid[row][col] = 0;
    }

    bt(0);

    if (solutions.length === 0) return null;
    return { grid: solutions[0], solutions };
  }

  // ─── Rater ────────────────────────────────────────────────────────────────
  /**
   * Rating approach:
   * We simulate a human-style logical solver and count how many cells can be
   * resolved via logic alone vs. requiring backtracking (trial & error).
   * We track:
   *   - naked singles (only one value possible in a cell)
   *   - cage elimination (cage constraints reduce candidates)
   *   - hidden singles in row/col (value has only one possible cell)
   *   - bifurcation depth needed (how deep guessing must go)
   *
   * Score = weighted sum → mapped to Easy / Medium / Hard / Expert
   */

  function rate(puzzle) {
    const { size, cages } = puzzle;

    // ── candidate sets ──
    const cands = [];
    for (let r = 0; r < size; r++) {
      cands.push([]);
      for (let c = 0; c < size; c++) {
        const s = new Set();
        for (let v = 1; v <= size; v++) s.add(v);
        cands[r].push(s);
      }
    }

    const cellToCage = [];
    for (let r = 0; r < size; r++) cellToCage.push(new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r, c]) => (cellToCage[r][c] = ci)));

    // Pre-compute which value combinations are valid for each cage
    function cageCombinations(cage) {
      const { cells, op, target } = cage;
      const n = cells.length;
      const combos = [];
      function gen(idx, cur) {
        if (idx === n) {
          if (checkCage(cur, op, target)) combos.push(cur.slice());
          return;
        }
        for (let v = 1; v <= size; v++) cur.push(v), gen(idx + 1, cur), cur.pop();
      }
      gen(0, []);
      return combos;
    }

    const cageCombos = cages.map(cageCombinations);

    let breakdown = {
      nakedSingles: 0,
      cageEliminations: 0,
      hiddenSingles: 0,
      bifurcationDepth: 0,
      avgCageComplexity: 0,

    };

    const grid = [];
    for (let r = 0; r < size; r++) grid.push(new Array(size).fill(0));

    function isPlaced(r, c) { return grid[r][c] !== 0; }

    function place(r, c, v) {
      grid[r][c] = v;
      cands[r][c] = new Set([v]);
      // eliminate from row/col
      for (let i = 0; i < size; i++) {
        if (i !== c) cands[r][i].delete(v);
        if (i !== r) cands[i][c].delete(v);
      }
    }

    // Apply cage constraint: remove candidates not appearing in any valid combo
    function applyCageCandidates() {
      let changed = false;
      cages.forEach((cage, ci) => {
        const { cells } = cage;
      if (!cells) return; // safety guard
        // Filter combos to those consistent with already-placed cells and current candidates
        const validCombos = cageCombos[ci].filter(combo => {
          return cells.every(([r, c], idx) => {
            if (isPlaced(r, c)) return grid[r][c] === combo[idx];
            return cands[r][c].has(combo[idx]);
          });
        });

        cells.forEach(([r, c], idx) => {
          if (isPlaced(r, c)) return;
          const allowed = new Set(validCombos.map(combo => combo[idx]));
          for (const v of [...cands[r][c]]) {
            if (!allowed.has(v)) {
              cands[r][c].delete(v);
              changed = true;
              breakdown.cageEliminations++;
            }
          }
        });
      });
      return changed;
    }

    function applyNakedSingles() {
      let changed = false;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (!isPlaced(r, c) && cands[r][c].size === 1) {
          place(r, c, [...cands[r][c]][0]);
          breakdown.nakedSingles++;
          changed = true;
        }
      }
      return changed;
    }

    function applyHiddenSingles() {
      let changed = false;
      // rows
      for (let r = 0; r < size; r++) {
        for (let v = 1; v <= size; v++) {
          const cols = [];
          for (let c = 0; c < size; c++) if (!isPlaced(r, c) && cands[r][c].has(v)) cols.push(c);
          if (cols.length === 1) {
            place(r, cols[0], v);
            breakdown.hiddenSingles++;
            changed = true;
          }
        }
      }
      // cols
      for (let c = 0; c < size; c++) {
        for (let v = 1; v <= size; v++) {
          const rows = [];
          for (let r = 0; r < size; r++) if (!isPlaced(r, c) && cands[r][c].has(v)) rows.push(r);
          if (rows.length === 1) {
            place(rows[0], c, v);
            breakdown.hiddenSingles++;
            changed = true;
          }
        }
      }
      return changed;
    }

    function logicPass() {
      let changed = true;
      while (changed) {
        changed = false;
        changed = applyCageCandidates() || changed;
        changed = applyNakedSingles() || changed;
        changed = applyHiddenSingles() || changed;
      }
    }

    function countUnplaced() {
      let n = 0;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!isPlaced(r, c)) n++;
      return n;
    }

    // First pure logic pass
    logicPass();
    const afterLogic = countUnplaced();

    // Count bifurcation depth needed
    // We do a limited simulation: find cells that still need guessing
    if (afterLogic > 0) {
      // Use actual solver to find solution, track how many times backtracking occurred
      const solveResult = solve(puzzle, { maxSolutions: 1 });
      if (solveResult) {
        // Estimate bifurcation by how constrained remaining cells are
        let minCands = Infinity;
        let bifCount = 0;
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
          if (!isPlaced(r, c)) {
            const sz = cands[r][c].size;
            if (sz < minCands) minCands = sz;
            if (sz > 1) bifCount++;
          }
        }
        breakdown.bifurcationDepth = Math.min(bifCount, 10);
      }
    }

    const solveResult = solve(puzzle, { maxSolutions: 2 });

    if (!solveResult || solveResult.solutions.length === 0)
      return { difficulty: "Impossible", score: Infinity, breakdown };

    const nonUnique = solveResult.solutions.length > 1;

    // ── Cage ambiguity stats ──
    let totalCageComplexity = 0;
    cages.forEach((cage, ci) => {
      let complexity = Math.log2(cageCombos[ci].length + 1);
      if (cage.op === '*' || cage.op === '/') complexity *= 1.5;
      else if (cage.op === '-') complexity *= 1.2;
      totalCageComplexity += complexity;
    });
    breakdown.avgCageComplexity = totalCageComplexity / cages.length;

    // Penalty for uncaged cells: fewer caged cells = harder
    const cagedCells = cages.reduce((s, c) => s + c.cells.length, 0);
    const totalCells = size * size;
    const cagedRatio = cagedCells === 0 ? 0 : Math.min(1, cagedCells / totalCells);
    const uncagedPenalty = cagedRatio === 0 ? Infinity : 1 / Math.sqrt(cagedRatio);

    // ── Score computation ──
    const score = Math.round(breakdown.avgCageComplexity * 5 * uncagedPenalty);

    let difficulty;
    if      (score < 15)  difficulty = "Easy";
    else if (score < 30)  difficulty = "Medium";
    else if (score < 50)  difficulty = "Hard";
    else if (score < 75)  difficulty = "Vicious";
    else if (score < 110) difficulty = "Devilish";
    else if (score < 160) difficulty = "Diabolical";
    else                  difficulty = "Beyond Diabolical";

    return { difficulty: nonUnique ? `Non-unique (${difficulty})` : difficulty, score, breakdown };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  global.MathdokuSolver = { solve, rate };

})(typeof window !== "undefined" ? window : global);
