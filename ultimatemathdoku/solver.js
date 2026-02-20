/**
 * solver.js — Mathdoku (KenKen) Solver + Rater
 *
 * API:
 *   MathdokuSolver.solve(puzzle, opts)  → { grid, solutions } | null
 *   MathdokuSolver.rate(puzzle)         → { difficulty, score, breakdown }
 *
 * Puzzle format:
 *   {
 *     size: 4,
 *     cages: [
 *       { cells: [[0,0],[0,1]], op: '+', target: 5 },
 *       ...
 *     ],
 *     givens: [          // optional
 *       { row: 0, col: 2, value: 3 },
 *       ...
 *     ]
 *   }
 *
 * Ops: '+', '-', '*', '/'
 * '-' and '/' sort values highest→lowest before applying left-to-right.
 */

(function(global) {
  "use strict";

  // ── Cage constraint checker ───────────────────────────────────────────────

  function checkCage(values, op, target) {
    if (!values.length) return false;
    switch(op) {
      case "=": return values.length === 1 && values[0] === target;
      case "+": return values.reduce((a,b) => a+b, 0) === target;
      case "*": return values.reduce((a,b) => a*b, 1) === target;
      case "-": {
        const s = [...values].sort((a,b) => b-a);
        return s.slice(1).reduce((acc,v) => acc-v, s[0]) === target;
      }
      case "/": {
        const s = [...values].sort((a,b) => b-a);
        return s.slice(1).reduce((acc,v) => acc/v, s[0]) === target;
      }
    }
    return false;
  }

  function partialCageOk(values, op, target) {
    if (!values.length) return true;
    switch(op) {
      case "+": return values.reduce((a,b) => a+b, 0) <= target;
      case "*": return values.reduce((a,b) => a*b, 1) <= target;
    }
    return true;
  }

  // ── Solver (backtracking) ─────────────────────────────────────────────────

  function solve(puzzle, opts) {
    opts = opts || {};
    const maxSolutions = opts.maxSolutions || 2;
    const { size, cages, givens } = puzzle;

    const cellToCage = Array.from({length: size}, () => new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r,c]) => cellToCage[r][c] = ci));

    const givenSet = new Set();
    const grid = Array.from({length: size}, () => new Array(size).fill(0));
    if (givens) {
      givens.forEach(g => {
        grid[g.row][g.col] = g.value;
        givenSet.add(g.row * size + g.col);
      });
    }

    const cageFilled = cages.map(() => []);
    const solutions = [];

    function bt(pos) {
      if (solutions.length >= maxSolutions) return;
      if (pos === size * size) {
        for (let ci = 0; ci < cages.length; ci++) {
          if (!checkCage(cageFilled[ci], cages[ci].op, cages[ci].target)) return;
        }
        solutions.push(grid.map(r => r.slice()));
        return;
      }
      const row = Math.floor(pos / size), col = pos % size;
      if (givenSet.has(pos)) { bt(pos+1); return; }
      const ci = cellToCage[row][col];
      for (let v = 1; v <= size; v++) {
        let ok = true;
        for (let c = 0; c < col; c++) if (grid[row][c] === v) { ok = false; break; }
        if (ok) for (let r = 0; r < row; r++) if (grid[r][col] === v) { ok = false; break; }
        if (!ok) continue;
        if (ci === -1) {
          grid[row][col] = v; bt(pos+1); grid[row][col] = 0;
        } else {
          const cage = cages[ci];
          const filled = cageFilled[ci];
          filled.push(v);
          const partial = filled.length < cage.cells.length
            ? partialCageOk(filled, cage.op, cage.target)
            : checkCage(filled, cage.op, cage.target);
          if (partial) { grid[row][col] = v; bt(pos+1); }
          filled.pop();
        }
        grid[row][col] = 0;
        if (solutions.length >= maxSolutions) return;
      }
    }

    bt(0);
    return solutions.length === 0 ? null : { grid: solutions[0], solutions };
  }

  // ── Rater (logic simulation) ──────────────────────────────────────────────

  function rate(puzzle) {
    const { size, cages } = puzzle;

    // Step 1: solvability check
    const solveResult = solve(puzzle, { maxSolutions: 2 });
    if (!solveResult || !solveResult.solutions.length)
      return { difficulty: "Impossible", score: Infinity, breakdown: {} };
    const nonUnique = solveResult.solutions.length > 1;

    // Step 2: simulate logical solving
    const cands = Array.from({length: size}, () =>
      Array.from({length: size}, () => new Set(Array.from({length: size}, (_,i) => i+1)))
    );
    const placed = Array.from({length: size}, () => new Array(size).fill(0));

    const cellToCage = Array.from({length: size}, () => new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r,c]) => cellToCage[r][c] = ci));

    function validCombos(cage) {
      const n = cage.cells.length, combos = [];
      function gen(idx, cur) {
        if (idx === n) { if (checkCage(cur, cage.op, cage.target)) combos.push(cur.slice()); return; }
        const [r,c] = cage.cells[idx];
        for (const v of cands[r][c]) { cur.push(v); gen(idx+1, cur); cur.pop(); }
      }
      gen(0, []);
      return combos;
    }

    function placeCell(r, c, v) {
      placed[r][c] = v;
      cands[r][c] = new Set([v]);
      for (let i = 0; i < size; i++) {
        if (i !== c) cands[r][i].delete(v);
        if (i !== r) cands[i][c].delete(v);
      }
    }

    (puzzle.givens || []).forEach(g => placeCell(g.row, g.col, g.value));

    let iterations = 0;
    let bifurcations = 0;

    function logicPass() {
      let anyChange = true;
      while (anyChange) {
        anyChange = false;

        // Cage elimination
        for (let ci = 0; ci < cages.length; ci++) {
          const cage = cages[ci];
          const combos = validCombos(cage);
          cage.cells.forEach(([r,c], idx) => {
            if (placed[r][c]) return;
            const allowed = new Set(combos.map(combo => combo[idx]));
            for (const v of [...cands[r][c]]) {
              if (!allowed.has(v)) { cands[r][c].delete(v); iterations++; anyChange = true; }
            }
          });
        }

        // Naked singles
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
          if (!placed[r][c] && cands[r][c].size === 1) {
            placeCell(r, c, [...cands[r][c]][0]);
            iterations++; anyChange = true;
          }
        }

        // Hidden singles — rows
        for (let r = 0; r < size; r++) {
          for (let v = 1; v <= size; v++) {
            const cols = [];
            for (let c = 0; c < size; c++) if (!placed[r][c] && cands[r][c].has(v)) cols.push(c);
            if (cols.length === 1) { placeCell(r, cols[0], v); iterations++; anyChange = true; }
          }
        }

        // Hidden singles — cols
        for (let c = 0; c < size; c++) {
          for (let v = 1; v <= size; v++) {
            const rows = [];
            for (let r = 0; r < size; r++) if (!placed[r][c] && cands[r][c].has(v)) rows.push(r);
            if (rows.length === 1) { placeCell(rows[0], c, v); iterations++; anyChange = true; }
          }
        }
      }
    }

    logicPass();

    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (!placed[r][c]) bifurcations++;

    // Step 3: score
    const score = iterations + bifurcations * 15;

    let difficulty;
    if (bifurcations === 0 && iterations === 0) difficulty = "Easy";
    else if (score < 20)  difficulty = "Easy";
    else if (score < 50)  difficulty = "Medium";
    else if (score < 100) difficulty = "Hard";
    else if (score < 180) difficulty = "Vicious";
    else if (score < 280) difficulty = "Devilish";
    else if (score < 420) difficulty = "Diabolical";
    else                  difficulty = "Beyond Diabolical";

    return {
      difficulty: nonUnique ? "Non-unique (" + difficulty + ")" : difficulty,
      score,
      breakdown: { iterations, bifurcations, solutionCount: solveResult.solutions.length }
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  global.MathdokuSolver = { solve, rate };

})(typeof window !== "undefined" ? window : global);
