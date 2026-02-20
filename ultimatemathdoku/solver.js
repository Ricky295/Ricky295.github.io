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
  //
  // Three-tier simulation:
  //   1. Singles  — naked single (one candidate left in cell),
  //                 hidden single (value has only one cell in row/col)
  //   2. Cage logic — eliminate candidates not present in ANY valid combo
  //                   for that cage given current candidates (naked sets per cage)
  //   3. Guessing — when neither singles nor cage logic make progress,
  //                 pick the most-constrained cell and try each candidate;
  //                 every branch attempted counts as a guess (not just the final).

  function rate(puzzle) {
    const { size, cages } = puzzle;

    // Step 0: solvability
    const solveResult = solve(puzzle, { maxSolutions: 2 });
    if (!solveResult || !solveResult.solutions.length)
      return { difficulty: "Impossible", score: Infinity, breakdown: {} };
    const nonUnique = solveResult.solutions.length > 1;

    let singlesUsed = 0;
    let cageElims   = 0;
    let guesses     = 0;  // every branch tried during bifurcation, not just correct ones

    // Build cell→cage map
    const cellToCage = Array.from({length: size}, () => new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r,c]) => cellToCage[r][c] = ci));

    // ── helpers that operate on a state object { cands, placed } ──

    function cloneState(st) {
      return {
        cands:  st.cands.map(row => row.map(s => new Set(s))),
        placed: st.placed.map(r => r.slice()),
      };
    }

    function placeCell(st, r, c, v) {
      st.placed[r][c] = v;
      st.cands[r][c]  = new Set([v]);
      for (let i = 0; i < size; i++) {
        if (i !== c) st.cands[r][i].delete(v);
        if (i !== r) st.cands[i][c].delete(v);
      }
    }

    // Returns valid combinations for a cage given current candidate sets
    function validCombos(st, cage) {
      const n = cage.cells.length, combos = [];
      function gen(idx, cur) {
        if (idx === n) {
          if (checkCage(cur, cage.op, cage.target)) combos.push(cur.slice());
          return;
        }
        const [r,c] = cage.cells[idx];
        for (const v of st.cands[r][c]) { cur.push(v); gen(idx+1, cur); cur.pop(); }
      }
      gen(0, []);
      return combos;
    }

    // Apply one full round of singles + cage logic.
    // Returns true if anything changed.
    function applyLogic(st) {
      let changed = false;

      // Cage elimination (tier 2)
      for (let ci = 0; ci < cages.length; ci++) {
        const cage = cages[ci];
        const combos = validCombos(st, cage);
        cage.cells.forEach(([r,c], idx) => {
          if (st.placed[r][c]) return;
          const allowed = new Set(combos.map(k => k[idx]));
          for (const v of [...st.cands[r][c]]) {
            if (!allowed.has(v)) {
              st.cands[r][c].delete(v);
              cageElims++;
              changed = true;
            }
          }
        });
      }

      // Naked singles (tier 1a)
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (!st.placed[r][c] && st.cands[r][c].size === 1) {
          placeCell(st, r, c, [...st.cands[r][c]][0]);
          singlesUsed++; changed = true;
        }
      }

      // Hidden singles — rows (tier 1b)
      for (let r = 0; r < size; r++) {
        for (let v = 1; v <= size; v++) {
          const cols = [];
          for (let c = 0; c < size; c++)
            if (!st.placed[r][c] && st.cands[r][c].has(v)) cols.push(c);
          if (cols.length === 1) {
            placeCell(st, r, cols[0], v);
            singlesUsed++; changed = true;
          }
        }
      }

      // Hidden singles — cols (tier 1b)
      for (let c = 0; c < size; c++) {
        for (let v = 1; v <= size; v++) {
          const rows = [];
          for (let r = 0; r < size; r++)
            if (!st.placed[r][c] && st.cands[r][c].has(v)) rows.push(r);
          if (rows.length === 1) {
            placeCell(st, rows[0], c, v);
            singlesUsed++; changed = true;
          }
        }
      }

      return changed;
    }

    // Run logic to fixpoint
    function logicFixpoint(st) {
      while (applyLogic(st)) { /* keep going */ }
    }

    function isSolved(st) {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (!st.placed[r][c]) return false;
      return true;
    }

    function isContradiction(st) {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (!st.placed[r][c] && st.cands[r][c].size === 0) return true;
      return false;
    }

    // Pick most-constrained unplaced cell (MRV heuristic)
    function pickCell(st) {
      let best = null, bestSize = Infinity;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (!st.placed[r][c]) {
          const s = st.cands[r][c].size;
          if (s < bestSize) { bestSize = s; best = [r,c]; }
        }
      }
      return best;
    }

    // Recursive guess-and-check; counts every branch attempted
    function search(st) {
      logicFixpoint(st);
      if (isContradiction(st)) return false;
      if (isSolved(st)) return true;

      const [r,c] = pickCell(st);
      for (const v of [...st.cands[r][c]]) {
        guesses++;                          // count EVERY attempt
        const branch = cloneState(st);
        placeCell(branch, r, c, v);
        if (search(branch)) return true;
      }
      return false;
    }

    // Build initial state
    const initState = {
      cands:  Array.from({length: size}, () =>
                Array.from({length: size}, () => new Set(Array.from({length: size}, (_,i) => i+1)))),
      placed: Array.from({length: size}, () => new Array(size).fill(0)),
    };
    (puzzle.givens || []).forEach(g => placeCell(initState, g.row, g.col, g.value));

    search(initState);

    // Score: guesses dominate (each is expensive), logic steps are cheap
    const raw   = singlesUsed + cageElims + guesses * 20;
    const maxRaw = size * size * (size * 20);   // normalise per grid size
    const score  = Math.min(100, Math.round((raw / maxRaw) * 100));

    let difficulty;
    if (raw === 0)       difficulty = "Easy";
    else if (score < 5)  difficulty = "Easy";
    else if (score < 15) difficulty = "Medium";
    else if (score < 30) difficulty = "Hard";
    else if (score < 50) difficulty = "Vicious";
    else if (score < 68) difficulty = "Devilish";
    else if (score < 85) difficulty = "Diabolical";
    else                 difficulty = "Beyond Diabolical";

    return {
      difficulty: nonUnique ? "Non-unique (" + difficulty + ")" : difficulty,
      score, raw,
      breakdown: { singlesUsed, cageElims, guesses, solutionCount: solveResult.solutions.length }
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  global.MathdokuSolver = { solve, rate };

})(typeof window !== "undefined" ? window : global);
