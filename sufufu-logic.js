/**
 * Sufufu — core puzzle logic (JS port)
 * ------------------------------------
 * Ported from the Python/Tkinter original. Contains ONLY the
 * logic-engine pieces requested:
 *   1. Solver engine — 16 human-style deduction techniques (no brute force
 *      is used to solve puzzles for the player).
 *   2. Difficulty classification — SE-inspired rating based on the
 *      hardest technique a puzzle's unique solve actually requires.
 *   3. Generator — builds a full solution, then digs clues out while
 *      re-solving after each removal, stopping once the puzzle first
 *      reaches the requested difficulty tier.
 *   4. Hint layer — wraps solve_step so a caller can reveal one useful
 *      action at a time, remembering prior candidate eliminations.
 *
 * No UI, no game-state (timer/mistakes/undo/etc). All functions are
 * pure(ish) — the solver techniques mutate the `notations` structure
 * that is passed in and also return it, mirroring the Python original's
 * in-place-mutation-plus-return style so ports of the calling code are
 * straightforward.
 *
 * Board convention: 8x8 grid, digits 1-4, each digit appears exactly
 * twice per row/column/2x4 box, no orthogonally-adjacent duplicates.
 *
 * `notations[r][c]` is either:
 *   - a number 1-4 (cell is filled), or
 *   - an array of candidate digits (cell is empty), e.g. [1,3,4]
 */

// ============================================================
// ---- Basic helpers -------------------------------------------
// ============================================================

const N = 8;
const DIGITS = [1, 2, 3, 4];

function isInt(x) {
  return typeof x === "number";
}
function isArr(x) {
  return Array.isArray(x);
}

function deepCopy(matrix) {
  return matrix.map((row) =>
    row.map((cell) => (isArr(cell) ? cell.slice() : cell))
  );
}

/** Convert a 64-char digit string into an 8x8 matrix. */
function convertToMatrix(str) {
  const matrix = Array.from({ length: 8 }, () => Array(8).fill(0));
  for (let i = 0; i < str.length; i++) {
    const digit = parseInt(str[i], 10);
    matrix[Math.floor(i / 8)][i % 8] = digit;
  }
  return matrix;
}

/** Build a notations grid from a plain digit matrix (0 = empty). */
function addNotations(matrix) {
  const notations = deepCopy(matrix);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (notations[i][j] === 0) {
        notations[i][j] = [1, 2, 3, 4];
      }
    }
  }
  return updateNotations(notations);
}

/**
 * Re-derive candidates from scratch given current fixed cells:
 * remove digits already used in each row/column/box, and remove
 * digits present in orthogonal neighbors.
 */
function updateNotations(notations) {
  const updated = deepCopy(notations);

  // Rows
  for (let i = 0; i < 8; i++) {
    let extra = [1, 2, 3, 4];
    for (let j = 0; j < 8; j++) {
      const cell = updated[i][j];
      if (isInt(cell)) {
        const idx = extra.indexOf(cell);
        if (idx !== -1) {
          extra.splice(idx, 1);
        } else {
          for (let k = 0; k < 8; k++) {
            if (isArr(updated[i][k])) {
              const p = updated[i][k].indexOf(cell);
              if (p !== -1) updated[i][k].splice(p, 1);
            }
          }
        }
      }
    }
  }

  // Columns
  for (let j = 0; j < 8; j++) {
    let extra = [1, 2, 3, 4];
    for (let i = 0; i < 8; i++) {
      const cell = updated[i][j];
      if (isInt(cell)) {
        const idx = extra.indexOf(cell);
        if (idx !== -1) {
          extra.splice(idx, 1);
        } else {
          for (let k = 0; k < 8; k++) {
            if (isArr(updated[k][j])) {
              const p = updated[k][j].indexOf(cell);
              if (p !== -1) updated[k][j].splice(p, 1);
            }
          }
        }
      }
    }
  }

  // 2x4 boxes
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      let extra = [1, 2, 3, 4];
      for (let r = regionRow; r < regionRow + 2; r++) {
        for (let c = regionCol; c < regionCol + 4; c++) {
          const cell = updated[r][c];
          if (isInt(cell)) {
            const idx = extra.indexOf(cell);
            if (idx !== -1) {
              extra.splice(idx, 1);
            } else {
              for (let rr = regionRow; rr < regionRow + 2; rr++) {
                for (let cc = regionCol; cc < regionCol + 4; cc++) {
                  if (isArr(updated[rr][cc])) {
                    const p = updated[rr][cc].indexOf(cell);
                    if (p !== -1) updated[rr][cc].splice(p, 1);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Orthogonal adjacency
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isArr(updated[i][j])) {
        const toRemove = new Set();
        for (const [dr, dc] of directions) {
          const r = i + dr,
            c = j + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const neighbor = updated[r][c];
            if (isInt(neighbor)) toRemove.add(neighbor);
          }
        }
        updated[i][j] = updated[i][j].filter((x) => !toRemove.has(x));
      }
    }
  }

  return updated;
}

// ============================================================
// ---- Solver techniques ---------------------------------------
// ============================================================
// Each technique returns [newNotations, changed] and mirrors the
// Python original's in-place mutation + return of the same object.

function nakedSingle(notations) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isArr(notations[i][j]) && notations[i][j].length === 1) {
        notations[i][j] = notations[i][j][0];
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

function lastDigit(notations) {
  // Rows
  for (let i = 0; i < 8; i++) {
    const row = notations[i];
    const digits = row.filter(isInt);
    if (digits.length === 7) {
      let missing = [1, 1, 2, 2, 3, 3, 4, 4];
      for (const d of digits) {
        const idx = missing.indexOf(d);
        if (idx !== -1) missing.splice(idx, 1);
      }
      if (missing.length === 1) {
        const emptyJ = row.findIndex((x) => !isInt(x));
        notations[i][emptyJ] = missing[0];
        return [updateNotations(notations), true];
      }
    }
  }

  // Columns
  for (let j = 0; j < 8; j++) {
    const col = [];
    for (let i = 0; i < 8; i++) col.push(notations[i][j]);
    const digits = col.filter(isInt);
    if (digits.length === 7) {
      let missing = [1, 1, 2, 2, 3, 3, 4, 4];
      for (const d of digits) {
        const idx = missing.indexOf(d);
        if (idx !== -1) missing.splice(idx, 1);
      }
      if (missing.length === 1) {
        const emptyI = col.findIndex((x) => !isInt(x));
        notations[emptyI][j] = missing[0];
        return [updateNotations(notations), true];
      }
    }
  }

  // Boxes
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      const vals = coords.map(([r, c]) => notations[r][c]);
      const digits = vals.filter(isInt);
      if (digits.length === 7) {
        let missing = [1, 1, 2, 2, 3, 3, 4, 4];
        for (const d of digits) {
          const idx = missing.indexOf(d);
          if (idx !== -1) missing.splice(idx, 1);
        }
        if (missing.length === 1) {
          for (const [r, c] of coords) {
            if (!isInt(notations[r][c])) {
              notations[r][c] = missing[0];
              return [updateNotations(notations), true];
            }
          }
        }
      }
    }
  }

  return [notations, false];
}

function orthogonalNakedSingle(notations) {
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const cell = notations[i][j];
      if (isArr(cell) && cell.length > 1) {
        const seen = new Set();
        for (const [dr, dc] of directions) {
          const r = i + dr,
            c = j + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const neighbor = notations[r][c];
            if (isInt(neighbor)) seen.add(neighbor);
          }
        }
        const remaining = cell.filter((x) => !seen.has(x));
        if (remaining.length === 1) {
          notations[i][j] = remaining[0];
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function lastTwin(notations) {
  function applyLastTwin(unitCoords) {
    const vals = unitCoords.map(([r, c]) => notations[r][c]);
    const digits = vals.filter(isInt);
    if (digits.length !== 6) return false;

    let counts = [1, 1, 2, 2, 3, 3, 4, 4];
    for (const d of digits) {
      const idx = counts.indexOf(d);
      if (idx !== -1) counts.splice(idx, 1);
    }
    if (counts.length !== 2 || counts[0] !== counts[1]) return false;

    const missing = counts[0];
    const empties = unitCoords.filter(([r, c]) => !isInt(notations[r][c]));
    if (empties.length !== 2) return false;

    const [a, b] = empties;
    const aVal = notations[a[0]][a[1]];
    const bVal = notations[b[0]][b[1]];
    if (
      isArr(aVal) &&
      isArr(bVal) &&
      arraysEqual(aVal, bVal) &&
      arraysEqual(aVal, [missing])
    ) {
      notations[a[0]][a[1]] = missing;
      notations[b[0]][b[1]] = missing;
      return true;
    }
    return false;
  }

  for (let i = 0; i < 8; i++) {
    const coords = Array.from({ length: 8 }, (_, j) => [i, j]);
    if (applyLastTwin(coords)) return [updateNotations(notations), true];
  }
  for (let j = 0; j < 8; j++) {
    const coords = Array.from({ length: 8 }, (_, i) => [i, j]);
    if (applyLastTwin(coords)) return [updateNotations(notations), true];
  }
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      if (applyLastTwin(coords)) return [updateNotations(notations), true];
    }
  }
  return [notations, false];
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function hiddenSingleBox(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      for (const digit of DIGITS) {
        const possibleCells = coords.filter(
          ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
        );
        if (possibleCells.length === 1) {
          const [r, c] = possibleCells[0];
          notations[r][c] = digit;
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function hiddenSingleLine(notations) {
  for (let i = 0; i < 8; i++) {
    for (const digit of DIGITS) {
      const possibleCells = [];
      for (let j = 0; j < 8; j++) {
        if (isArr(notations[i][j]) && notations[i][j].includes(digit))
          possibleCells.push([i, j]);
      }
      if (possibleCells.length === 1) {
        const [r, c] = possibleCells[0];
        notations[r][c] = digit;
        return [updateNotations(notations), true];
      }
    }
  }
  for (let j = 0; j < 8; j++) {
    for (const digit of DIGITS) {
      const possibleCells = [];
      for (let i = 0; i < 8; i++) {
        if (isArr(notations[i][j]) && notations[i][j].includes(digit))
          possibleCells.push([i, j]);
      }
      if (possibleCells.length === 1) {
        const [r, c] = possibleCells[0];
        notations[r][c] = digit;
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

function hiddenTwinBox(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      for (const digit of DIGITS) {
        const possibleCells = coords.filter(
          ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
        );
        const digitFixedInBox = coords.some(
          ([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit
        );
        if (possibleCells.length === 2 && !digitFixedInBox) {
          for (const [r, c] of possibleCells) notations[r][c] = digit;
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function hiddenTwinLine(notations) {
  function checkLine(coords) {
    for (const digit of DIGITS) {
      const possibleCells = coords.filter(
        ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
      );
      const digitFixed = coords.some(
        ([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit
      );
      if (possibleCells.length === 2 && !digitFixed) {
        for (const [r, c] of possibleCells) notations[r][c] = digit;
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < 8; i++) {
    const coords = Array.from({ length: 8 }, (_, j) => [i, j]);
    if (checkLine(coords)) return [updateNotations(notations), true];
  }
  for (let j = 0; j < 8; j++) {
    const coords = Array.from({ length: 8 }, (_, i) => [i, j]);
    if (checkLine(coords)) return [updateNotations(notations), true];
  }
  return [notations, false];
}

function almostHiddenTwinCorner(notations) {
  function checkLine(coords) {
    for (const digit of DIGITS) {
      const fixedCount = coords.filter(
        ([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit
      ).length;
      if (fixedCount !== 0) continue;

      const possibleCells = coords.filter(
        ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
      );
      if (possibleCells.length !== 3) continue;

      const positions = possibleCells
        .map((cell) => coords.findIndex((cc) => cc[0] === cell[0] && cc[1] === cell[1]))
        .sort((a, b) => a - b);

      if (positions[1] - positions[0] === 1 && positions[2] - positions[1] === 1) {
        const [midR, midC] = coords[positions[1]];
        if (isArr(notations[midR][midC]) && notations[midR][midC].includes(digit)) {
          notations[midR][midC] = notations[midR][midC].filter((x) => x !== digit);
          return true;
        }
      }
    }
    return false;
  }

  for (let i = 0; i < 8; i++) {
    const coords = Array.from({ length: 8 }, (_, j) => [i, j]);
    if (checkLine(coords)) return [updateNotations(notations), true];
  }
  for (let j = 0; j < 8; j++) {
    const coords = Array.from({ length: 8 }, (_, i) => [i, j]);
    if (checkLine(coords)) return [updateNotations(notations), true];
  }
  return [notations, false];
}

function almostHiddenTwinSeparated(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const boxCoords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) boxCoords.push([r, c]);

      for (const digit of DIGITS) {
        const digitFixedInBox = boxCoords.some(
          ([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit
        );
        if (digitFixedInBox) continue;

        const possibleInBox = boxCoords.filter(
          ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
        );
        if (possibleInBox.length !== 3) continue;

        for (const subRow of [regionRow, regionRow + 1]) {
          const otherRow = subRow === regionRow ? regionRow + 1 : regionRow;
          const inSub = possibleInBox.filter(([r]) => r === subRow);
          const inOther = possibleInBox.filter(([r]) => r === otherRow);
          if (inSub.length === 2 && inOther.length === 1) {
            const [[, c1], [, c2]] = inSub;
            if (Math.abs(c1 - c2) === 1) {
              const [r, c] = inOther[0];
              notations[r][c] = digit;
              return [updateNotations(notations), true];
            }
          }
        }
      }
    }
  }
  return [notations, false];
}

function getQuadrants(rowTop) {
  const rowBot = rowTop + 1;
  const leftCols = [0, 1, 2, 3];
  const rightCols = [4, 5, 6, 7];

  const qTopLeft = leftCols.map((c) => [rowTop, c]);
  const qBotLeft = leftCols.map((c) => [rowBot, c]);
  const qTopRight = rightCols.map((c) => [rowTop, c]);
  const qBotRight = rightCols.map((c) => [rowBot, c]);

  return [
    [qTopLeft, qBotRight],
    [qBotLeft, qTopRight],
  ];
}

function digitCountBounds(notations, quadrant, digit) {
  let fixed = 0;
  const candidateCells = [];
  for (const [r, c] of quadrant) {
    const cell = notations[r][c];
    if (isInt(cell)) {
      if (cell === digit) fixed += 1;
    } else if (isArr(cell)) {
      if (cell.includes(digit)) candidateCells.push([r, c]);
    }
  }
  return [fixed, fixed + candidateCells.length, candidateCells];
}

function intersectionBasic(notations) {
  for (let rowTop = 0; rowTop < 8; rowTop += 2) {
    for (const [quadA, quadB] of getQuadrants(rowTop)) {
      for (const digit of DIGITS) {
        const [minA, maxA] = digitCountBounds(notations, quadA, digit);
        if (minA !== maxA) continue;
        const confirmedCount = minA;

        const [fixedB, , candidatesB] = digitCountBounds(notations, quadB, digit);
        if (fixedB >= confirmedCount) continue;
        const needed = confirmedCount - fixedB;
        if (needed === candidatesB.length && candidatesB.length === 1) {
          const [r, c] = candidatesB[0];
          notations[r][c] = digit;
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function intersectionAdvanced(notations) {
  for (let rowTop = 0; rowTop < 8; rowTop += 2) {
    for (const [quadA, quadB] of getQuadrants(rowTop)) {
      for (const digit of DIGITS) {
        const [minA, maxA] = digitCountBounds(notations, quadA, digit);
        if (minA !== maxA) continue;
        const confirmedCount = minA;

        const [fixedB, , candidatesB] = digitCountBounds(notations, quadB, digit);
        if (fixedB > confirmedCount) continue;
        const needed = confirmedCount - fixedB;

        if (needed === 0 && candidatesB.length > 0) {
          let changed = false;
          for (const [r, c] of candidatesB) {
            notations[r][c] = notations[r][c].filter((x) => x !== digit);
            changed = true;
          }
          if (changed) return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function allUnits() {
  const units = [];
  for (let i = 0; i < 8; i++) {
    units.push(Array.from({ length: 8 }, (_, j) => [i, j]));
  }
  for (let j = 0; j < 8; j++) {
    units.push(Array.from({ length: 8 }, (_, i) => [i, j]));
  }
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      units.push(coords);
    }
  }
  return units;
}

function isOrthogonalNeighbor(a, b) {
  const [r1, c1] = a;
  const [r2, c2] = b;
  return (r1 === r2 && Math.abs(c1 - c2) === 1) || (c1 === c2 && Math.abs(r1 - r2) === 1);
}

function diamond(notations) {
  for (const unit of allUnits()) {
    for (const digit of DIGITS) {
      const fixedCount = unit.filter(
        ([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit
      ).length;
      if (fixedCount !== 0) continue;

      const candidateCells = unit.filter(
        ([r, c]) => isArr(notations[r][c]) && notations[r][c].includes(digit)
      );
      if (candidateCells.length < 3) continue;

      for (const hub of candidateCells) {
        const others = candidateCells.filter((cell) => cell !== hub);
        if (others.every((other) => isOrthogonalNeighbor(hub, other))) {
          const [r, c] = hub;
          notations[r][c] = notations[r][c].filter((x) => x !== digit);
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function unitedNakedPair(notations) {
  for (const unit of allUnits()) {
    const listCells = unit.filter(([r, c]) => isArr(notations[r][c]));
    for (let i = 0; i < listCells.length; i++) {
      for (let j = i + 1; j < listCells.length; j++) {
        const cellA = listCells[i];
        const cellB = listCells[j];
        if (!isOrthogonalNeighbor(cellA, cellB)) continue;
        const [ra, ca] = cellA;
        const [rb, cb] = cellB;
        const setA = notations[ra][ca];
        const setB = notations[rb][cb];
        if (setA.length !== 2 || !arraysEqual(setA, setB)) continue;

        const pairDigits = setA;
        for (const digit of pairDigits) {
          const digitFixedElsewhere = unit.some(
            ([r, c]) =>
              !((r === ra && c === ca) || (r === rb && c === cb)) &&
              isInt(notations[r][c]) &&
              notations[r][c] === digit
          );
          if (!digitFixedElsewhere) continue;

          let changed = false;
          for (const [r, c] of unit) {
            if ((r === ra && c === ca) || (r === rb && c === cb)) continue;
            const cell = notations[r][c];
            if (isArr(cell) && cell.includes(digit)) {
              notations[r][c] = cell.filter((x) => x !== digit);
              changed = true;
            }
          }
          if (changed) return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function* generateCombinations(candidateLists) {
  if (candidateLists.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = candidateLists;
  for (const value of first) {
    for (const restCombo of generateCombinations(rest)) {
      yield [value, ...restCombo];
    }
  }
}

function validCombinationsForUnit(notations, unit, emptyCells) {
  const existingDigitCount = [0, 0, 0, 0];
  for (const [r, c] of unit) {
    const cell = notations[r][c];
    if (isInt(cell)) existingDigitCount[cell - 1] += 1;
  }

  const candidateLists = emptyCells.map(([r, c]) => notations[r][c]);
  const valid = [];
  for (const combo of generateCombinations(candidateLists)) {
    const counts = existingDigitCount.slice();
    for (const digit of combo) counts[digit - 1] += 1;
    if (counts.some((count) => count !== 2)) continue;

    let violation = false;
    for (let i = 0; i < emptyCells.length - 1 && !violation; i++) {
      for (let j = i + 1; j < emptyCells.length; j++) {
        if (combo[i] === combo[j] && isOrthogonalNeighbor(emptyCells[i], emptyCells[j])) {
          violation = true;
          break;
        }
      }
    }
    if (!violation) valid.push(combo);
  }
  return valid;
}

function combinationsBasic(notations, size) {
  for (const unit of allUnits()) {
    const emptyCells = unit.filter(([r, c]) => isArr(notations[r][c]));
    if (emptyCells.length !== size) continue;

    const valid = validCombinationsForUnit(notations, unit, emptyCells);
    if (valid.length === 0) continue;

    for (let i = 0; i < emptyCells.length; i++) {
      const [r, c] = emptyCells[i];
      const valuesAtI = new Set(valid.map((combo) => combo[i]));
      if (valuesAtI.size === 1) {
        notations[r][c] = [...valuesAtI][0];
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

function combinationsAdvanced(notations, size) {
  for (const unit of allUnits()) {
    const emptyCells = unit.filter(([r, c]) => isArr(notations[r][c]));
    if (emptyCells.length !== size) continue;

    const valid = validCombinationsForUnit(notations, unit, emptyCells);
    if (valid.length === 0) continue;

    for (let i = 0; i < emptyCells.length; i++) {
      const [r, c] = emptyCells[i];
      const valuesAtI = new Set(valid.map((combo) => combo[i]));
      const cell = notations[r][c];
      const toRemove = cell.filter((d) => !valuesAtI.has(d));
      if (toRemove.length > 0) {
        notations[r][c] = cell.filter((d) => valuesAtI.has(d));
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

function comboBasicAny(notations) {
  for (let size = 3; size <= 6; size++) {
    const [n, changed] = combinationsBasic(notations, size);
    if (changed) return [n, true];
  }
  return [notations, false];
}

function comboAdvancedAny(notations) {
  for (let size = 3; size <= 6; size++) {
    const [n, changed] = combinationsAdvanced(notations, size);
    if (changed) return [n, true];
  }
  return [notations, false];
}

function isSolved(matrix) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (matrix[i][j] === 0 || isArr(matrix[i][j])) return false;
    }
  }
  return true;
}

// ============================================================
// ---- Technique registry & difficulty ---------------------------------------
// ============================================================

const LABELS = [
  "Last Digit",
  "Last Twin",
  "Orthogonal Naked Single",
  "Naked Single",
  "Hidden Single (Box)",
  "Hidden Twin (Box)",
  "Hidden Single (Line)",
  "Hidden Twin (Line)",
  "Almost Hidden Twin (Corner)",
  "Almost Hidden Twin (Separated)",
  "Intersection (Basic)",
  "Intersection (Advanced)",
  "Diamond",
  "United Naked Pair",
  "Combinations (Basic)",
  "Combinations (Advanced)",
];

// SE-style difficulty weights per technique. Higher = harder.
const TECHNIQUE_DIFFICULTY = [
  1.0, // Last Digit
  1.2, // Last Twin
  1.2, // Orthogonal Naked Single
  1.5, // Naked Single
  1.5, // Hidden Single (Box)
  2.0, // Hidden Twin (Box)
  1.7, // Hidden Single (Line)
  2.2, // Hidden Twin (Line)
  2.8, // Almost Hidden Twin (Corner)
  2.8, // Almost Hidden Twin (Separated)
  3.2, // Intersection (Basic)
  3.6, // Intersection (Advanced)
  3.8, // Diamond
  3.4, // United Naked Pair
  4.5, // Combinations (Basic)
  5.5, // Combinations (Advanced)
];

// [name, hardest_technique_idx_ceiling (inclusive), label color]
const DIFFICULTY_TIERS = [
  ["Easy", 3, "#2e7d32"],
  ["Medium", 7, "#f9a825"],
  ["Hard", 11, "#ef6c00"],
  ["Expert", 13, "#c62828"],
  ["Extreme", 15, "#6a1b9a"],
];

const DIFF_NAMES = DIFFICULTY_TIERS.map((t) => t[0]);
const DIFF_COLORS = Object.fromEntries(DIFFICULTY_TIERS.map((t) => [t[0], t[2]]));

const TECHNIQUES_BY_DIFFICULTY = {
  Easy: ["Last Digit", "Last Twin", "Orthogonal Naked Single", "Naked Single"],
  Medium: [
    "Last Digit",
    "Last Twin",
    "Orthogonal Naked Single",
    "Naked Single",
    "Hidden Single (Box)",
    "Hidden Twin (Box)",
    "Hidden Single (Line)",
    "Hidden Twin (Line)",
  ],
  Hard: [
    "Almost Hidden Twin (Corner)",
    "Almost Hidden Twin (Separated)",
    "Intersection (Basic)",
    "Intersection (Advanced)",
  ],
  Expert: ["Diamond", "United Naked Pair"],
  Extreme: ["Combinations (Basic)", "Combinations (Advanced)"],
};

/**
 * Given the list of technique indices used to fully solve a puzzle,
 * return {name, color, hardestIdx, totalScore}.
 */
function classifyDifficulty(log) {
  if (!log || log.length === 0) {
    const [name, , color] = DIFFICULTY_TIERS[0];
    return { name, color, hardestIdx: 0, totalScore: 0.0 };
  }
  const hardestIdx = Math.max(...log);
  const totalScore = log.reduce((sum, i) => sum + TECHNIQUE_DIFFICULTY[i], 0);
  for (const [name, ceiling, color] of DIFFICULTY_TIERS) {
    if (hardestIdx <= ceiling) return { name, color, hardestIdx, totalScore };
  }
  const [name, , color] = DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];
  return { name, color, hardestIdx, totalScore };
}

// Priority-ordered technique list; index == LABELS index.
const TECHNIQUES = [
  (n) => lastDigit(n),
  (n) => lastTwin(n),
  (n) => orthogonalNakedSingle(n),
  (n) => nakedSingle(n),
  (n) => hiddenSingleBox(n),
  (n) => hiddenTwinBox(n),
  (n) => hiddenSingleLine(n),
  (n) => hiddenTwinLine(n),
  (n) => almostHiddenTwinCorner(n),
  (n) => almostHiddenTwinSeparated(n),
  (n) => intersectionBasic(n),
  (n) => intersectionAdvanced(n),
  (n) => diamond(n),
  (n) => unitedNakedPair(n),
  (n) => comboBasicAny(n),
  (n) => comboAdvancedAny(n),
];

/** Try each technique in priority order. Returns {notations, changed, idx}. */
function solveStep(notations) {
  for (let idx = 0; idx < TECHNIQUES.length; idx++) {
    const [newNotations, changed] = TECHNIQUES[idx](notations);
    if (changed) return { notations: newNotations, changed: true, idx };
  }
  return { notations, changed: false, idx: null };
}

/**
 * Runs solveStep repeatedly. Returns {notations, log} where log is a
 * list of technique indices in order applied.
 */
function solveFull(notations) {
  const log = [];
  let n = notations;
  while (true) {
    const result = solveStep(n);
    n = result.notations;
    if (!result.changed) break;
    log.push(result.idx);
  }
  return { notations: n, log };
}

// ============================================================
// ---- Puzzle generator ---------------------------------------
// ============================================================

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Backtracking filler used ONLY to build a valid complete board for
 * puzzle generation (never used for solving user-facing puzzles).
 */
function fullBoardCandidates(board) {
  function valid(board, r, c, d) {
    let rowCount = 0;
    for (let cc = 0; cc < 8; cc++) if (board[r][cc] === d) rowCount++;
    if (rowCount >= 2) return false;

    let colCount = 0;
    for (let rr = 0; rr < 8; rr++) if (board[rr][c] === d) colCount++;
    if (colCount >= 2) return false;

    const rr0 = Math.floor(r / 2) * 2;
    const cc0 = Math.floor(c / 4) * 4;
    let boxCount = 0;
    for (let rr = rr0; rr < rr0 + 2; rr++)
      for (let cc = cc0; cc < cc0 + 4; cc++) if (board[rr][cc] === d) boxCount++;
    if (boxCount >= 2) return false;

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of directions) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === d) return false;
    }
    return true;
  }

  const cells = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) cells.push([r, c]);

  function backtrack(idx) {
    if (idx === cells.length) return true;
    const [r, c] = cells[idx];
    const digits = shuffle(DIGITS);
    for (const d of digits) {
      if (valid(board, r, c, d)) {
        board[r][c] = d;
        if (backtrack(idx + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  backtrack(0);
  return board;
}

function generateFullSolution() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(0));
  fullBoardCandidates(board);
  return board;
}

/**
 * Remove clues one at a time (random order) while the puzzle stays
 * solvable by pure logic. After each successful removal, re-classify the
 * puzzle's difficulty; stop as soon as it first reaches the target tier
 * (or overshoots past it), rather than digging to the hardest extreme.
 * Returns {puzzle, log, name, color} for whatever was reached.
 */
function digPuzzleTowardsTier(solution, targetRank, tierNames) {
  const puzzle = deepCopy(solution);
  const cells = shuffle(
    Array.from({ length: 64 }, (_, i) => [Math.floor(i / 8), i % 8])
  );

  let bestPuzzle = null,
    bestLog = [],
    bestName = null,
    bestColor = null;
  const minEmpty = 20; // never settle for a near-full board, even for Easy

  for (const [r, c] of cells) {
    if (bestName !== null) {
      const rank = tierNames.indexOf(bestName);
      let empties = 0;
      for (let rr = 0; rr < 8; rr++)
        for (let cc = 0; cc < 8; cc++) if (puzzle[rr][cc] === 0) empties++;
      if (rank >= targetRank && empties >= minEmpty) break;
    }

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const notations = addNotations(puzzle);
    const { notations: solvedNotations, log: newLog } = solveFull(notations);
    if (!isSolved(solvedNotations)) {
      puzzle[r][c] = backup;
      continue;
    }

    const { name: newName, color: newColor } = classifyDifficulty(newLog);
    bestPuzzle = deepCopy(puzzle);
    bestLog = newLog;
    bestName = newName;
    bestColor = newColor;
  }

  if (bestPuzzle === null) {
    // Degenerate case: couldn't remove even one clue (shouldn't happen
    // in practice). Fall back to the full solution minus one cell.
    bestPuzzle = deepCopy(solution);
    const notations = addNotations(bestPuzzle);
    const result = solveFull(notations);
    bestLog = result.log;
    const cls = classifyDifficulty(bestLog);
    bestName = cls.name;
    bestColor = cls.color;
  }

  return { puzzle: bestPuzzle, log: bestLog, name: bestName, color: bestColor };
}

/**
 * Repeatedly dig puzzles from fresh full solutions, stopping the dig
 * as soon as the target tier is first reached, until an exact match is
 * found. Falls back to the closest match found if maxTries is
 * exhausted.
 *
 * progressCb(attempt, maxTries) is called before each attempt, if given.
 * Returns {puzzle, solution, name, color, log}.
 */
function generatePuzzleForTier(tierName, maxTries = 12, progressCb = null) {
  const tierNames = DIFFICULTY_TIERS.map((t) => t[0]);
  const targetRank = tierNames.indexOf(tierName);

  let best = null; // {dist, puzzle, solution, name, color, log}
  for (let attempt = 0; attempt < maxTries; attempt++) {
    if (progressCb) progressCb(attempt + 1, maxTries);
    const solution = generateFullSolution();
    const { puzzle, log, name, color } = digPuzzleTowardsTier(
      solution,
      targetRank,
      tierNames
    );
    const rank = tierNames.indexOf(name);
    const dist = Math.abs(rank - targetRank);

    if (dist === 0) {
      return { puzzle, solution, name, color, log };
    }
    if (best === null || dist < best.dist) {
      best = { dist, puzzle, solution, name, color, log };
    }
  }

  const { puzzle, solution, name, color, log } = best;
  return { puzzle, solution, name, color, log };
}

// ============================================================
// ---- Hint layer -------------------------------------------
// ============================================================
// A thin wrapper around solveStep for callers that want to reveal one
// useful action at a time while remembering prior candidate
// eliminations across repeated hint requests (mirrors the Python
// give_hint()/hint_eliminations machinery, minus any UI/game state).

/**
 * Build authoritative candidates for `board` (a plain 0/1-4 matrix)
 * while retaining prior elimination hints.
 *
 * `eliminations` is an 8x8 array of Sets/iterables of digits already
 * ruled out by earlier hints for that cell (pass a fresh 8x8 array of
 * empty sets if you have none yet).
 */
function buildHintNotations(board, eliminations) {
  const notations = addNotations(board);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isArr(notations[r][c])) {
        const elim = eliminations[r][c];
        notations[r][c] = notations[r][c].filter((digit) => !elim.has(digit));
      }
    }
  }
  return notations;
}

/** Return placements and removals made by exactly one solver step. */
function hintChanges(before, after) {
  const digitCells = [];
  const narrowedCells = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const oldCell = before[r][c];
      const newCell = after[r][c];
      if (isArr(oldCell) && isInt(newCell)) {
        digitCells.push([r, c, newCell]);
      } else if (isArr(oldCell) && isArr(newCell)) {
        const newSet = new Set(newCell);
        const removed = oldCell.filter((x) => !newSet.has(x)).sort((a, b) => a - b);
        if (removed.length > 0) {
          narrowedCells.push([r, c, oldCell, newCell, removed]);
        }
      }
    }
  }
  return { digitCells, narrowedCells };
}

/**
 * Compute one hint step from a board + prior eliminations.
 *
 * Returns one of:
 *   { type: "none" }
 *     — no logical hint is available from the current board.
 *   { type: "placement", label, r, c, digit }
 *     — a definite digit can be placed; a real placement always takes
 *       precedence over pencil-mark updates, matching the original.
 *   { type: "elimination", label, cells: [{r, c, candidates, removed}] }
 *     — one or more cells had candidates ruled out. Callers should
 *       merge `removed` into their own eliminations store so a
 *       subsequent call to this function continues from this result
 *       instead of rediscovering the same deduction.
 *   { type: "noop", label }
 *     — defensive fallback: the solver step fired but produced no
 *       placement or candidate removal a caller can apply.
 *
 * This function does not mutate `board` or `eliminations` — callers
 * own applying the result to their own state.
 */
function computeHint(board, eliminations) {
  const notations = buildHintNotations(board, eliminations);
  const before = deepCopy(notations);
  const { notations: newNotations, changed, idx } = solveStep(notations);

  if (!changed) {
    return { type: "none" };
  }

  const label = LABELS[idx];
  const { digitCells, narrowedCells } = hintChanges(before, newNotations);

  if (digitCells.length > 0) {
    const [r, c, digit] = digitCells[0];
    return { type: "placement", label, r, c, digit };
  }

  if (narrowedCells.length > 0) {
    const cells = narrowedCells.map(([r, c, , newCandidates, removed]) => ({
      r,
      c,
      candidates: newCandidates,
      removed,
    }));
    return { type: "elimination", label, cells };
  }

  return { type: "noop", label };
}

// ============================================================
// ---- Exports -------------------------------------------
// ============================================================

export {
  // constants
  N,
  DIGITS,
  LABELS,
  TECHNIQUE_DIFFICULTY,
  DIFFICULTY_TIERS,
  DIFF_NAMES,
  DIFF_COLORS,
  TECHNIQUES_BY_DIFFICULTY,
  // matrix helpers
  convertToMatrix,
  addNotations,
  updateNotations,
  isSolved,
  // individual techniques (exposed for testing / custom orchestration)
  nakedSingle,
  lastDigit,
  orthogonalNakedSingle,
  lastTwin,
  hiddenSingleBox,
  hiddenSingleLine,
  hiddenTwinBox,
  hiddenTwinLine,
  almostHiddenTwinCorner,
  almostHiddenTwinSeparated,
  intersectionBasic,
  intersectionAdvanced,
  diamond,
  unitedNakedPair,
  combinationsBasic,
  combinationsAdvanced,
  // solver driver
  solveStep,
  solveFull,
  classifyDifficulty,
  // generator
  generateFullSolution,
  digPuzzleTowardsTier,
  generatePuzzleForTier,
  // hint layer
  buildHintNotations,
  hintChanges,
  computeHint,
};
