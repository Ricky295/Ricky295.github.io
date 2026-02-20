/**
 * solver.js — Mathdoku Solver + Rater
 * Works both as a normal script and as a Web Worker.
 *
 * Direct API (same-thread):
 *   MathdokuSolver.solve(puzzle, opts)  → { grid, solutions } | null
 *   MathdokuSolver.rate(puzzle)         → { difficulty, score, breakdown }
 *
 * Worker API (postMessage):
 *   post { type:'solve'|'rate'|'solveAndRate', puzzle, opts }
 *   receive { type:'solveResult'|'rateResult'|'solveAndRateResult', ... }
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

  // ── Precompute valid cage combinations ────────────────────────────────────
  // Called once per cage. Returns array of valid value-arrays.

  function precomputeCombos(cage, size) {
    const n = cage.cells.length;
    const combos = [];
    function gen(idx, cur) {
      if (idx === n) {
        if (checkCage(cur, cage.op, cage.target)) combos.push(cur.slice());
        return;
      }
      for (let v = 1; v <= size; v++) { cur.push(v); gen(idx+1, cur); cur.pop(); }
    }
    gen(0, []);
    return combos;
  }

  // ── Solver (backtracking + precomputed combos) ────────────────────────────

  function solve(puzzle, opts) {
    opts = opts || {};
    const maxSolutions = opts.maxSolutions || 2;
    const deadline = opts.timeLimitMs ? performance.now() + opts.timeLimitMs : Infinity;
    const { size, cages, givens } = puzzle;

    const cellToCage = Array.from({length: size}, () => new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r,c]) => cellToCage[r][c] = ci));

    // Precompute all valid combos per cage
    const cageComboSets = cages.map(cage => precomputeCombos(cage, size));

    const givenSet = new Set();
    const grid = Array.from({length: size}, () => new Array(size).fill(0));
    if (givens) givens.forEach(g => {
      grid[g.row][g.col] = g.value;
      givenSet.add(g.row * size + g.col);
    });

    // Track how many cells of each cage have been filled and their values
    const cageFilled = cages.map(() => []);
    const solutions = [];

    function bt(pos) {
      if (solutions.length >= maxSolutions) return;
      if (performance.now() > deadline) return;
      if (pos === size * size) {
        // Verify all cages complete
        for (let ci = 0; ci < cages.length; ci++)
          if (!checkCage(cageFilled[ci], cages[ci].op, cages[ci].target)) return;
        solutions.push(grid.map(r => r.slice()));
        return;
      }
      const row = Math.floor(pos / size), col = pos % size;
      if (givenSet.has(pos)) { bt(pos+1); return; }
      const ci = cellToCage[row][col];

      for (let v = 1; v <= size; v++) {
        // Latin square check
        let ok = true;
        for (let c = 0; c < col; c++) if (grid[row][c] === v) { ok = false; break; }
        if (ok) for (let r = 0; r < row; r++) if (grid[r][col] === v) { ok = false; break; }
        if (!ok) continue;

        if (ci === -1) {
          grid[row][col] = v; bt(pos+1); grid[row][col] = 0;
        } else {
          const cage   = cages[ci];
          const filled = cageFilled[ci];
          filled.push(v);

          // Use precomputed combos to prune: check if any combo matches filled so far
          const filledLen = filled.length;
          const cageIdx   = cage.cells.findIndex(([r,c]) => r===row && c===col);
          let viable = false;
          const combos = cageComboSets[ci];
          for (let k = 0; k < combos.length; k++) {
            const combo = combos[k];
            let match = true;
            // Check all placed cells in this cage so far
            for (let f = 0; f < filledLen; f++) {
              if (combo[f] !== filled[f]) { match = false; break; }
            }
            if (match) { viable = true; break; }
          }

          if (viable) {
            grid[row][col] = v; bt(pos+1);
          }
          filled.pop();
        }
        grid[row][col] = 0;
        if (solutions.length >= maxSolutions) return;
      }
    }

    bt(0);
    return solutions.length === 0 ? null : { grid: solutions[0], solutions };
  }

  // ── Rater ─────────────────────────────────────────────────────────────────

  function rate(puzzle, timeLimitMs) {
    const deadline = timeLimitMs ? performance.now() + timeLimitMs : Infinity;
    const { size, cages } = puzzle;

    const solveResult = solve(puzzle, { maxSolutions: 2, timeLimitMs: timeLimitMs || 500 });
    if (!solveResult || !solveResult.solutions.length)
      return { difficulty: "Impossible", score: Infinity, breakdown: {} };
    const nonUnique = solveResult.solutions.length > 1;

    // Precompute combos ONCE — reused throughout logic simulation
    const cellToCage = Array.from({length: size}, () => new Array(size).fill(-1));
    cages.forEach((cage, ci) => cage.cells.forEach(([r,c]) => cellToCage[r][c] = ci));

    // Cache: for each cage, current valid combos (filtered as candidates shrink)
    const cacheC = cages.map(cage => precomputeCombos(cage, size));

    const cands  = Array.from({length: size}, () =>
      Array.from({length: size}, () => new Set(Array.from({length: size}, (_,i) => i+1)))
    );
    const placed = Array.from({length: size}, () => new Array(size).fill(0));

    function placeCell(r, c, v) {
      placed[r][c] = v;
      cands[r][c]  = new Set([v]);
      for (let i = 0; i < size; i++) {
        if (i !== c) cands[r][i].delete(v);
        if (i !== r) cands[i][c].delete(v);
      }
    }

    (puzzle.givens || []).forEach(g => placeCell(g.row, g.col, g.value));

    let singlesUsed = 0, cageElims = 0, guesses = 0;

    // Filter cached combos using current candidates
    function filterCombos(ci) {
      const cage = cages[ci];
      cacheC[ci] = cacheC[ci].filter(combo =>
        cage.cells.every(([r,c], idx) =>
          placed[r][c] ? placed[r][c] === combo[idx] : cands[r][c].has(combo[idx])
        )
      );
      return cacheC[ci];
    }

    function applyLogic(st) {
      let changed = false;

      // Cage elimination using filtered combos
      for (let ci = 0; ci < cages.length; ci++) {
        const cage   = cages[ci];
        const combos = filterCombos(ci);
        cage.cells.forEach(([r,c], idx) => {
          if (placed[r][c]) return;
          const allowed = new Set(combos.map(k => k[idx]));
          for (const v of [...cands[r][c]]) {
            if (!allowed.has(v)) { cands[r][c].delete(v); cageElims++; changed = true; }
          }
        });
      }

      // Naked singles
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (!placed[r][c] && cands[r][c].size === 1) {
          placeCell(r, c, [...cands[r][c]][0]);
          singlesUsed++; changed = true;
        }
      }

      // Hidden singles rows
      for (let r = 0; r < size; r++) for (let v = 1; v <= size; v++) {
        const cols = [];
        for (let c = 0; c < size; c++) if (!placed[r][c] && cands[r][c].has(v)) cols.push(c);
        if (cols.length === 1) { placeCell(r, cols[0], v); singlesUsed++; changed = true; }
      }

      // Hidden singles cols
      for (let c = 0; c < size; c++) for (let v = 1; v <= size; v++) {
        const rows = [];
        for (let r = 0; r < size; r++) if (!placed[r][c] && cands[r][c].has(v)) rows.push(r);
        if (rows.length === 1) { placeCell(rows[0], c, v); singlesUsed++; changed = true; }
      }

      return changed;
    }

    function cloneState() {
      return {
        cands:  cands.map(row => row.map(s => new Set(s))),
        placed: placed.map(r => r.slice()),
        cache:  cacheC.map(combos => combos.map(c => c.slice())),
      };
    }

    function restoreState(st) {
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        cands[r][c]  = new Set(st.cands[r][c]);
        placed[r][c] = st.placed[r][c];
      }
      for (let ci = 0; ci < cages.length; ci++) cacheC[ci] = st.cache[ci].map(c => c.slice());
    }

    function logicFixpoint() { while (applyLogic()) {} }

    function isSolved()        { return placed.every(row => row.every(v => v !== 0)); }
    function isContradiction() { return cands.some(row => row.some((s,c) => !placed[Math.floor(row.indexOf?.(s)/1)][c] && s.size===0)); }

    function pickCell() {
      let best = null, bestSz = Infinity;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
        if (!placed[r][c] && cands[r][c].size < bestSz) { bestSz = cands[r][c].size; best = [r,c]; }
      return best;
    }

    function search() {
      if (performance.now() > deadline) return false;
      logicFixpoint();
      // Contradiction check
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
        if (!placed[r][c] && cands[r][c].size === 0) return false;
      if (isSolved()) return true;
      const cell = pickCell();
      if (!cell) return false;
      const [r,c] = cell;
      for (const v of [...cands[r][c]]) {
        guesses++;
        const snap = cloneState();
        placeCell(r, c, v);
        if (search()) return true; // keep going to count all branches? no — just count guesses
        restoreState(snap);
      }
      return false;
    }

    search();

    const raw   = singlesUsed + cageElims + guesses * 20;
    const score = +(raw / Math.pow(size, 4)).toFixed(3);

    let difficulty;
    if (raw === 0)         difficulty = "Easy";
    else if (score < 0.5)  difficulty = "Easy";
    else if (score < 1.2)  difficulty = "Medium";
    else if (score < 1.6)  difficulty = "Hard";
    else if (score < 2.5)  difficulty = "Vicious";
    else if (score < 3.4)  difficulty = "Devilish";
    else if (score < 5.0)  difficulty = "Diabolical";
    else                   difficulty = "Beyond Diabolical";

    return {
      difficulty: nonUnique ? "Non-unique (" + difficulty + ")" : difficulty,
      score, raw,
      breakdown: { singlesUsed, cageElims, guesses, solutionCount: solveResult.solutions.length }
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const MathdokuSolver = { solve, rate };

  // Expose as global when used as a normal script
  if (typeof window !== 'undefined') window.MathdokuSolver = MathdokuSolver;

  // Web Worker message handler
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.onmessage = function(e) {
      const { type, puzzle, opts, callId } = e.data;
      if (type === 'solve') {
        const result = solve(puzzle, opts);
        self.postMessage({ type: 'solveResult', result, callId });
      } else if (type === 'rate') {
        const result = rate(puzzle);
        self.postMessage({ type: 'rateResult', result, callId });
      } else if (type === 'solveAndRate') {
        const solveResult = solve(puzzle, opts);
        const rateResult  = solveResult ? rate(puzzle, opts.timeLimitMs || 500) : null;
        self.postMessage({ type: 'solveAndRateResult', solveResult, rateResult, callId });
      }
    };
  }

})(typeof window !== 'undefined' ? window : self);
