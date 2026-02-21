/**
 * solver.js — Mathdoku (KenKen) Solver + Rater (OPTIMIZED v2)
 *
 * API:
 *   MathdokuSolver.solve(puzzle, opts)  → { grid, solutions } | null
 *   MathdokuSolver.rate(puzzle)         → { difficulty, score, breakdown }
 */

(function(global) {
  "use strict";

  // ── Encode op string to int for faster comparison ────────────────────────
  const OP_ENCODE = { "=": 0, "+": 1, "*": 2, "-": 3, "/": 4 };

  // ── Cage constraint checker (inlined for speed) ───────────────────────────
  function checkCage(values, op, target) {
    const n = values.length;
    if (n === 0) return false;
    switch(op) {
      case 0: return n === 1 && values[0] === target;
      case 1: {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += values[i];
        return sum === target;
      }
      case 2: {
        let prod = 1;
        for (let i = 0; i < n; i++) prod *= values[i];
        return prod === target;
      }
      case 3: {
        let max = values[0], maxIdx = 0;
        for (let i = 1; i < n; i++) if (values[i] > max) { max = values[i]; maxIdx = i; }
        let result = max;
        for (let i = 0; i < n; i++) if (i !== maxIdx) result -= values[i];
        return result === target;
      }
      case 4: {
        let max = values[0], maxIdx = 0;
        for (let i = 1; i < n; i++) if (values[i] > max) { max = values[i]; maxIdx = i; }
        let result = max;
        for (let i = 0; i < n; i++) if (i !== maxIdx) result /= values[i];
        return result === target;
      }
    }
    return false;
  }

  function partialCageOk(values, op, target) {
    const n = values.length;
    if (n === 0) return true;
    switch(op) {
      case 1: {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += values[i];
        return sum <= target;
      }
      case 2: {
        let prod = 1;
        for (let i = 0; i < n; i++) prod *= values[i];
        return prod <= target;
      }
    }
    return true;
  }

  // ── Solver (backtracking with bitmasks) ───────────────────────────────────

  function solve(puzzle, opts) {
    opts = opts || {};
    const maxSolutions = opts.maxSolutions || 2;
    const size = puzzle.size;
    const cages = puzzle.cages;
    const givens = puzzle.givens;
    const totalCells = size * size;

    // Preprocess: encode ops, build cell→cage map
    const cageCount = cages.length;
    const cageOps = new Array(cageCount);
    const cageTargets = new Array(cageCount);
    const cageCells = new Array(cageCount);

    for (let i = 0; i < cageCount; i++) {
      const c = cages[i];
      cageOps[i] = OP_ENCODE[c.op] ?? 0;
      cageTargets[i] = c.target;
      cageCells[i] = c.cells;
    }

    const cellToCage = new Array(totalCells).fill(-1);
    for (let ci = 0; ci < cageCount; ci++) {
      const cells = cageCells[ci];
      for (let i = 0; i < cells.length; i++) {
        const r = cells[i][0], c = cells[i][1];
        cellToCage[r * size + c] = ci;
      }
    }

    // Grid and tracking
    const grid = Array.from({length: size}, () => new Array(size).fill(0));
    const givenSet = new Set();

    if (givens && givens.length) {
      for (let i = 0; i < givens.length; i++) {
        const g = givens[i];
        grid[g.row][g.col] = g.value;
        givenSet.add(g.row * size + g.col);
      }
    }

    // Cage fill tracking (using arrays like original, but pre-allocated)
    const cageFilled = new Array(cageCount);
    for (let i = 0; i < cageCount; i++) {
      cageFilled[i] = [];
    }

    // Bitmask tracking for row/col (major optimization)
    const rowMask = new Array(size).fill(0);
    const colMask = new Array(size).fill(0);

    if (givens && givens.length) {
      for (let i = 0; i < givens.length; i++) {
        const g = givens[i];
        const bit = 1 << (g.value - 1);
        rowMask[g.row] |= bit;
        colMask[g.col] |= bit;
      }
    }

    const solutions = [];

    function bt(pos) {
      if (solutions.length >= maxSolutions) return;
      if (pos === totalCells) {
        for (let ci = 0; ci < cageCount; ci++) {
          if (!checkCage(cageFilled[ci], cageOps[ci], cageTargets[ci])) return;
        }
        solutions.push(grid.map(r => r.slice()));
        return;
      }

      const row = Math.floor(pos / size);
      const col = pos % size;

      if (givenSet.has(pos)) { bt(pos + 1); return; }

      const ci = cellToCage[pos];
      const forbidden = rowMask[row] | colMask[col];

      for (let v = 1; v <= size; v++) {
        const bit = 1 << (v - 1);
        if (forbidden & bit) continue;

        if (ci === -1) {
          grid[row][col] = v;
          rowMask[row] |= bit;
          colMask[col] |= bit;
          bt(pos + 1);
          rowMask[row] ^= bit;
          colMask[col] ^= bit;
        } else {
          const filled = cageFilled[ci];
          filled.push(v);
          const partial = filled.length < cageCells[ci].length
            ? partialCageOk(filled, cageOps[ci], cageTargets[ci])
            : checkCage(filled, cageOps[ci], cageTargets[ci]);
          if (partial) {
            grid[row][col] = v;
            rowMask[row] |= bit;
            colMask[col] |= bit;
            bt(pos + 1);
            rowMask[row] ^= bit;
            colMask[col] ^= bit;
          }
          filled.pop();
        }
        if (solutions.length >= maxSolutions) return;
      }
      grid[row][col] = 0;
    }

    bt(0);
    return solutions.length === 0 ? null : { grid: solutions[0], solutions };
  }

  // ── Rater (optimized logic simulation) ────────────────────────────────────

  function rate(puzzle) {
    const size = puzzle.size;
    const cages = puzzle.cages;
    const totalCells = size * size;

    // Step 0: solvability
    const solveResult = solve(puzzle, { maxSolutions: 2 });
    if (!solveResult || solveResult.solutions.length === 0)
      return { difficulty: "Impossible", score: Infinity, breakdown: {} };
    const nonUnique = solveResult.solutions.length > 1;

    let singlesUsed = 0;
    let cageElims = 0;
    let guesses = 0;

    // Preprocess cages
    const cageCount = cages.length;
    const cageOps = new Array(cageCount);
    const cageTargets = new Array(cageCount);
    const cageCells = new Array(cageCount);

    for (let i = 0; i < cageCount; i++) {
      const c = cages[i];
      cageOps[i] = OP_ENCODE[c.op] ?? 0;
      cageTargets[i] = c.target;
      cageCells[i] = c.cells;
    }

    // Cell to cage mapping
    const cellToCage = new Array(totalCells).fill(-1);
    for (let ci = 0; ci < cageCount; ci++) {
      const cells = cageCells[ci];
      for (let i = 0; i < cells.length; i++) {
        const r = cells[i][0], c = cells[i][1];
        cellToCage[r * size + c] = ci;
      }
    }

    // Candidates as bitmasks
    const allMask = (1 << size) - 1;

    function cloneState(st) {
      return {
        cands: st.cands.slice(),
        placed: st.placed.slice(),
      };
    }

    function placeCell(st, idx, v) {
      const bit = 1 << (v - 1);
      st.placed[idx] = v;
      st.cands[idx] = bit;
      const row = Math.floor(idx / size);
      const col = idx % size;

      for (let i = 0; i < size; i++) {
        const colIdx = row * size + i;
        if (colIdx !== idx) st.cands[colIdx] &= ~bit;
        const rowIdx = i * size + col;
        if (rowIdx !== idx) st.cands[rowIdx] &= ~bit;
      }
    }

    // Generate valid combo masks for a cage
    function validComboMasks(st, ci) {
      const cells = cageCells[ci];
      const n = cells.length;
      const op = cageOps[ci];
      const target = cageTargets[ci];
      const positionMasks = new Array(n).fill(0);
      const current = new Array(n);

      // Pre-extract candidate masks
      const cellMasks = new Array(n);
      for (let i = 0; i < n; i++) {
        const r = cells[i][0], c = cells[i][1];
        cellMasks[i] = st.cands[r * size + c];
      }

      function gen(idx) {
        if (idx === n) {
          if (checkCage(current, op, target)) {
            for (let i = 0; i < n; i++) {
              positionMasks[i] |= 1 << (current[i] - 1);
            }
          }
          return;
        }
        const mask = cellMasks[idx];
        for (let v = 1; v <= size; v++) {
          if (mask & (1 << (v - 1))) {
            current[idx] = v;
            gen(idx + 1);
          }
        }
      }
      gen(0);
      return positionMasks;
    }

    function applyLogic(st) {
      let changed = false;

      // Cage elimination
      for (let ci = 0; ci < cageCount; ci++) {
        const cells = cageCells[ci];
        const positionMasks = validComboMasks(st, ci);

        for (let i = 0; i < cells.length; i++) {
          const r = cells[i][0], c = cells[i][1];
          const idx = r * size + c;
          if (st.placed[idx]) continue;
          const oldMask = st.cands[idx];
          const newMask = oldMask & positionMasks[i];
          if (newMask !== oldMask) {
            st.cands[idx] = newMask;
            cageElims += popcount(oldMask) - popcount(newMask);
            changed = true;
          }
        }
      }

      // Naked singles
      for (let idx = 0; idx < totalCells; idx++) {
        if (!st.placed[idx] && popcount(st.cands[idx]) === 1) {
          placeCell(st, idx, getSingleValue(st.cands[idx]));
          singlesUsed++;
          changed = true;
        }
      }

      // Hidden singles - rows
      for (let r = 0; r < size; r++) {
        for (let v = 1; v <= size; v++) {
          const bit = 1 << (v - 1);
          let count = 0, lastIdx = -1;
          for (let c = 0; c < size; c++) {
            const idx = r * size + c;
            if (!st.placed[idx] && (st.cands[idx] & bit)) {
              count++;
              lastIdx = idx;
            }
          }
          if (count === 1) {
            placeCell(st, lastIdx, v);
            singlesUsed++;
            changed = true;
          }
        }
      }

      // Hidden singles - cols
      for (let c = 0; c < size; c++) {
        for (let v = 1; v <= size; v++) {
          const bit = 1 << (v - 1);
          let count = 0, lastIdx = -1;
          for (let r = 0; r < size; r++) {
            const idx = r * size + c;
            if (!st.placed[idx] && (st.cands[idx] & bit)) {
              count++;
              lastIdx = idx;
            }
          }
          if (count === 1) {
            placeCell(st, lastIdx, v);
            singlesUsed++;
            changed = true;
          }
        }
      }

      return changed;
    }

    function logicFixpoint(st) {
      while (applyLogic(st)) {}
    }

    function isSolved(st) {
      for (let idx = 0; idx < totalCells; idx++) {
        if (!st.placed[idx]) return false;
      }
      return true;
    }

    function isContradiction(st) {
      for (let idx = 0; idx < totalCells; idx++) {
        if (!st.placed[idx] && st.cands[idx] === 0) return true;
      }
      return false;
    }

    function pickCell(st) {
      let bestIdx = -1, bestSize = 255;
      for (let idx = 0; idx < totalCells; idx++) {
        if (!st.placed[idx]) {
          const s = popcount(st.cands[idx]);
          if (s < bestSize) {
            bestSize = s;
            bestIdx = idx;
            if (s === 2) break;
          }
        }
      }
      return bestIdx;
    }

    function search(st) {
      logicFixpoint(st);
      if (isContradiction(st)) return false;
      if (isSolved(st)) return true;

      const idx = pickCell(st);
      const mask = st.cands[idx];
      let anySuccess = false;

      for (let v = 1; v <= size; v++) {
        if (mask & (1 << (v - 1))) {
          const branch = cloneState(st);
          placeCell(branch, idx, v);
          guesses++;
          const ok = search(branch);
          if (ok) anySuccess = true;
        }
      }
      return anySuccess;
    }

    // Build initial state
    const initState = {
      cands: new Array(totalCells).fill(allMask),
      placed: new Array(totalCells).fill(0),
    };

    if (puzzle.givens) {
      for (let i = 0; i < puzzle.givens.length; i++) {
        const g = puzzle.givens[i];
        placeCell(initState, g.row * size + g.col, g.value);
      }
    }

    const hasConstraints = cages.length > 0;
    search(initState);

    if (!hasConstraints) {
      return {
        difficulty: "Non-unique (Beyond Diabolical)",
        score: 100, raw: Infinity,
        breakdown: { singlesUsed: 0, cageElims: 0, guesses: 0, solutionCount: solveResult.solutions.length }
      };
    }

    const raw = singlesUsed + cageElims + guesses * 20;
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

  // ── Bit manipulation helpers ─────────────────────────────────────────────
  function popcount(x) {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0F0F0F0F;
    x = x + (x >> 8);
    x = x + (x >> 16);
    return x & 0x3F;
  }

  function getSingleValue(mask) {
    let v = 1;
    while (!(mask & 1)) {
      mask >>= 1;
      v++;
    }
    return v;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  global.MathdokuSolver = { solve, rate };

})(typeof window !== "undefined" ? window : global);
