/**
 * solver.js
 * ---------
 * JS module port of an 8x8 "4-digit sudoku" style solver
 * (2x4 rectangular regions, digits 1-4, each appearing twice per
 * row/column/region, plus an orthogonal-adjacency constraint).
 *
 * Faithful port of the original Python logic, plus some extra
 * helper functions added at the bottom (see "EXTRA FUNCTIONS").
 */

// ---------------------------------------------------------------
// Core setup
// ---------------------------------------------------------------

/** Deep clone helper (works for our matrix of ints / arrays). */
function deepClone(matrix) {
  return matrix.map(row => row.map(cell => (Array.isArray(cell) ? [...cell] : cell)));
}

/** Convert a 64-char digit string into an 8x8 matrix. */
export function convertToMatrix(string) {
  const matrix = Array.from({ length: 8 }, () => Array(8).fill(0));
  for (let i = 0; i < string.length; i++) {
    const digit = parseInt(string[i], 10);
    matrix[Math.floor(i / 8)][i % 8] = digit;
  }
  return matrix;
}

/** Turn every 0 cell into a [1,2,3,4] notation list, then propagate constraints. */
export function addNotations(matrix) {
  const notations = deepClone(matrix);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (notations[i][j] === 0) notations[i][j] = [1, 2, 3, 4];
    }
  }
  return updateNotations(notations);
}

/** Coordinates of the 2x4 region containing (row, col). */
export function getRegionIndices(row, col) {
  const regionRow = Math.floor(row / 2) * 2;
  const regionCol = Math.floor(col / 4) * 4;
  const coords = [];
  for (let r = regionRow; r < regionRow + 2; r++) {
    for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
  }
  return coords;
}

function isInt(cell) {
  return typeof cell === 'number';
}
function isList(cell) {
  return Array.isArray(cell);
}

/** Re-apply all basic constraint propagation rules to the notations grid. */
export function updateNotations(notationsIn) {
  const updated = deepClone(notationsIn);

  // Enforce max 2 of each digit per row
  for (let i = 0; i < 8; i++) {
    const extra = [1, 2, 3, 4];
    for (let j = 0; j < 8; j++) {
      const cell = updated[i][j];
      if (isInt(cell)) {
        const idx = extra.indexOf(cell);
        if (idx !== -1) {
          extra.splice(idx, 1);
        } else {
          for (let k = 0; k < 8; k++) {
            if (isList(updated[i][k])) {
              const ridx = updated[i][k].indexOf(cell);
              if (ridx !== -1) updated[i][k].splice(ridx, 1);
            }
          }
        }
      }
    }
  }

  // Enforce max 2 per column
  for (let j = 0; j < 8; j++) {
    const extra = [1, 2, 3, 4];
    for (let i = 0; i < 8; i++) {
      const cell = updated[i][j];
      if (isInt(cell)) {
        const idx = extra.indexOf(cell);
        if (idx !== -1) {
          extra.splice(idx, 1);
        } else {
          for (let k = 0; k < 8; k++) {
            if (isList(updated[k][j])) {
              const ridx = updated[k][j].indexOf(cell);
              if (ridx !== -1) updated[k][j].splice(ridx, 1);
            }
          }
        }
      }
    }
  }

  // Enforce max 2 per region
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const extra = [1, 2, 3, 4];
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
                  if (isList(updated[rr][cc])) {
                    const ridx = updated[rr][cc].indexOf(cell);
                    if (ridx !== -1) updated[rr][cc].splice(ridx, 1);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Adjacency rule (orthogonal only)
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isList(updated[i][j])) {
        const toRemove = new Set();
        for (const [dr, dc] of directions) {
          const r = i + dr, c = j + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const neighbor = updated[r][c];
            if (isInt(neighbor)) toRemove.add(neighbor);
          }
        }
        updated[i][j] = updated[i][j].filter(x => !toRemove.has(x));
      }
    }
  }

  return updated;
}

// ---------------------------------------------------------------
// Solving techniques (each returns [notations, changed])
// ---------------------------------------------------------------

export function nakedSingle(notations) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isList(notations[i][j]) && notations[i][j].length === 1) {
        notations[i][j] = notations[i][j][0];
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

export function lastDigit(notations) {
  // ROWS
  for (let i = 0; i < 8; i++) {
    const row = notations[i];
    const digits = row.filter(isInt);
    if (digits.length === 7) {
      const missing = [1, 1, 2, 2, 3, 3, 4, 4];
      for (const d of digits) {
        const idx = missing.indexOf(d);
        if (idx !== -1) missing.splice(idx, 1);
      }
      if (missing.length === 1) {
        const emptyJ = row.findIndex(x => !isInt(x));
        notations[i][emptyJ] = missing[0];
        return [updateNotations(notations), true];
      }
    }
  }

  // COLUMNS
  for (let j = 0; j < 8; j++) {
    const col = notations.map(row => row[j]);
    const digits = col.filter(isInt);
    if (digits.length === 7) {
      const missing = [1, 1, 2, 2, 3, 3, 4, 4];
      for (const d of digits) {
        const idx = missing.indexOf(d);
        if (idx !== -1) missing.splice(idx, 1);
      }
      if (missing.length === 1) {
        const emptyI = notations.findIndex(row => !isInt(row[j]));
        notations[emptyI][j] = missing[0];
        return [updateNotations(notations), true];
      }
    }
  }

  // REGIONS
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      const vals = coords.map(([r, c]) => notations[r][c]);
      const digits = vals.filter(isInt);
      if (digits.length === 7) {
        const missing = [1, 1, 2, 2, 3, 3, 4, 4];
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

export function orthogonalNakedSingle(notations) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const cell = notations[i][j];
      if (isList(cell) && cell.length > 1) {
        const seen = new Set();
        for (const [dr, dc] of directions) {
          const r = i + dr, c = j + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const neighbor = notations[r][c];
            if (isInt(neighbor)) seen.add(neighbor);
          }
        }
        const remaining = cell.filter(x => !seen.has(x));
        if (remaining.length === 1) {
          notations[i][j] = remaining[0];
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

export function lastTwin(notations) {
  function applyLastTwin(unitCoords) {
    const vals = unitCoords.map(([r, c]) => notations[r][c]);
    const digits = vals.filter(isInt);
    if (digits.length !== 6) return false;

    const counts = [1, 1, 2, 2, 3, 3, 4, 4];
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
      isList(aVal) && isList(bVal) &&
      aVal.length === 1 && bVal.length === 1 &&
      aVal[0] === missing && bVal[0] === missing
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

export function hiddenSingleBox(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      for (const digit of [1, 2, 3, 4]) {
        const possible = coords.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
        if (possible.length === 1) {
          const [r, c] = possible[0];
          notations[r][c] = digit;
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

export function hiddenSingleLine(notations) {
  for (let i = 0; i < 8; i++) {
    for (const digit of [1, 2, 3, 4]) {
      const possible = [];
      for (let j = 0; j < 8; j++) if (isList(notations[i][j]) && notations[i][j].includes(digit)) possible.push([i, j]);
      if (possible.length === 1) {
        const [r, c] = possible[0];
        notations[r][c] = digit;
        return [updateNotations(notations), true];
      }
    }
  }

  for (let j = 0; j < 8; j++) {
    for (const digit of [1, 2, 3, 4]) {
      const possible = [];
      for (let i = 0; i < 8; i++) if (isList(notations[i][j]) && notations[i][j].includes(digit)) possible.push([i, j]);
      if (possible.length === 1) {
        const [r, c] = possible[0];
        notations[r][c] = digit;
        return [updateNotations(notations), true];
      }
    }
  }

  return [notations, false];
}

export function hiddenTwinBox(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const coords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) coords.push([r, c]);
      for (const digit of [1, 2, 3, 4]) {
        const possible = coords.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
        const digitFixed = coords.some(([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit);
        if (possible.length === 2 && !digitFixed) {
          for (const [r, c] of possible) notations[r][c] = digit;
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

export function hiddenTwinLine(notations) {
  function checkLine(coords) {
    for (const digit of [1, 2, 3, 4]) {
      const possible = coords.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
      const digitFixed = coords.some(([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit);
      if (possible.length === 2 && !digitFixed) {
        for (const [r, c] of possible) notations[r][c] = digit;
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

export function almostHiddenTwinCorner(notations) {
  function checkLine(coords) {
    for (const digit of [1, 2, 3, 4]) {
      const fixedCount = coords.filter(([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit).length;
      if (fixedCount !== 0) continue;

      const possible = coords.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
      if (possible.length !== 3) continue;

      const coordKey = ([r, c]) => `${r},${c}`;
      const coordIndex = new Map(coords.map((cell, idx) => [coordKey(cell), idx]));
      const positions = possible.map(cell => coordIndex.get(coordKey(cell))).sort((a, b) => a - b);

      if (positions[1] - positions[0] === 1 && positions[2] - positions[1] === 1) {
        const [midR, midC] = coords[positions[1]];
        if (isList(notations[midR][midC]) && notations[midR][midC].includes(digit)) {
          notations[midR][midC] = notations[midR][midC].filter(x => x !== digit);
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

export function almostHiddenTwinSeparated(notations) {
  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const boxCoords = [];
      for (let r = regionRow; r < regionRow + 2; r++)
        for (let c = regionCol; c < regionCol + 4; c++) boxCoords.push([r, c]);

      for (const digit of [1, 2, 3, 4]) {
        const digitFixedInBox = boxCoords.some(([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit);
        if (digitFixedInBox) continue;

        const possibleInBox = boxCoords.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
        if (possibleInBox.length !== 3) continue;

        for (const subRow of [regionRow, regionRow + 1]) {
          const otherRow = subRow === regionRow ? regionRow + 1 : regionRow;
          const inSub = possibleInBox.filter(([r]) => r === subRow);
          const inOther = possibleInBox.filter(([r]) => r === otherRow);
          if (inSub.length === 2 && inOther.length === 1) {
            const [[r1, c1], [r2, c2]] = inSub;
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

  const qTopLeft = leftCols.map(c => [rowTop, c]);
  const qBotLeft = leftCols.map(c => [rowBot, c]);
  const qTopRight = rightCols.map(c => [rowTop, c]);
  const qBotRight = rightCols.map(c => [rowBot, c]);

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
      if (cell === digit) fixed++;
    } else if (isList(cell)) {
      if (cell.includes(digit)) candidateCells.push([r, c]);
    }
  }
  return [fixed, fixed + candidateCells.length, candidateCells];
}

export function intersectionBasic(notations) {
  for (let rowTop = 0; rowTop < 8; rowTop += 2) {
    for (const [quadA, quadB] of getQuadrants(rowTop)) {
      for (const digit of [1, 2, 3, 4]) {
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

export function intersectionAdvanced(notations) {
  for (let rowTop = 0; rowTop < 8; rowTop += 2) {
    for (const [quadA, quadB] of getQuadrants(rowTop)) {
      for (const digit of [1, 2, 3, 4]) {
        const [minA, maxA] = digitCountBounds(notations, quadA, digit);
        if (minA !== maxA) continue;
        const confirmedCount = minA;

        const [fixedB, , candidatesB] = digitCountBounds(notations, quadB, digit);
        if (fixedB > confirmedCount) continue;
        const needed = confirmedCount - fixedB;

        if (needed === 0 && candidatesB.length) {
          for (const [r, c] of candidatesB) {
            notations[r][c] = notations[r][c].filter(x => x !== digit);
          }
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

function allUnits() {
  const units = [];
  for (let i = 0; i < 8; i++) units.push(Array.from({ length: 8 }, (_, j) => [i, j]));
  for (let j = 0; j < 8; j++) units.push(Array.from({ length: 8 }, (_, i) => [i, j]));
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
  const [r1, c1] = a, [r2, c2] = b;
  return (r1 === r2 && Math.abs(c1 - c2) === 1) || (c1 === c2 && Math.abs(r1 - r2) === 1);
}

export function diamond(notations) {
  for (const unit of allUnits()) {
    for (const digit of [1, 2, 3, 4]) {
      const fixedCount = unit.filter(([r, c]) => isInt(notations[r][c]) && notations[r][c] === digit).length;
      if (fixedCount !== 0) continue;

      const candidateCells = unit.filter(([r, c]) => isList(notations[r][c]) && notations[r][c].includes(digit));
      if (candidateCells.length < 3) continue;

      for (const hub of candidateCells) {
        const others = candidateCells.filter(cell => cell !== hub);
        if (others.every(other => isOrthogonalNeighbor(hub, other))) {
          const [r, c] = hub;
          notations[r][c] = notations[r][c].filter(x => x !== digit);
          return [updateNotations(notations), true];
        }
      }
    }
  }
  return [notations, false];
}

export function unitedNakedPair(notations) {
  for (const unit of allUnits()) {
    const listCells = unit.filter(([r, c]) => isList(notations[r][c]));
    for (let i = 0; i < listCells.length; i++) {
      for (let j = i + 1; j < listCells.length; j++) {
        const cellA = listCells[i], cellB = listCells[j];
        if (!isOrthogonalNeighbor(cellA, cellB)) continue;
        const [ra, ca] = cellA, [rb, cb] = cellB;
        const setA = notations[ra][ca], setB = notations[rb][cb];
        if (setA.length !== 2 || setA.length !== setB.length ||
            !setA.every(x => setB.includes(x))) continue;

        const pairDigits = setA;
        for (const digit of pairDigits) {
          const digitFixedElsewhere = unit.some(([r, c]) => {
            if ((r === ra && c === ca) || (r === rb && c === cb)) return false;
            return isInt(notations[r][c]) && notations[r][c] === digit;
          });
          if (!digitFixedElsewhere) continue;

          let changed = false;
          for (const [r, c] of unit) {
            if ((r === ra && c === ca) || (r === rb && c === cb)) continue;
            const cell = notations[r][c];
            if (isList(cell) && cell.includes(digit)) {
              notations[r][c] = cell.filter(x => x !== digit);
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
    if (isInt(cell)) existingDigitCount[cell - 1]++;
  }

  const candidateLists = emptyCells.map(([r, c]) => notations[r][c]);
  const valid = [];
  for (const combo of generateCombinations(candidateLists)) {
    const counts = [...existingDigitCount];
    for (const digit of combo) counts[digit - 1]++;
    if (counts.some(count => count !== 2)) continue;

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

export function combinationsBasic(notations, size) {
  for (const unit of allUnits()) {
    const emptyCells = unit.filter(([r, c]) => isList(notations[r][c]));
    if (emptyCells.length !== size) continue;

    const valid = validCombinationsForUnit(notations, unit, emptyCells);
    if (!valid.length) continue;

    for (let i = 0; i < emptyCells.length; i++) {
      const [r, c] = emptyCells[i];
      const valuesAtI = new Set(valid.map(combo => combo[i]));
      if (valuesAtI.size === 1) {
        notations[r][c] = [...valuesAtI][0];
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

export function combinationsAdvanced(notations, size) {
  for (const unit of allUnits()) {
    const emptyCells = unit.filter(([r, c]) => isList(notations[r][c]));
    if (emptyCells.length !== size) continue;

    const valid = validCombinationsForUnit(notations, unit, emptyCells);
    if (!valid.length) continue;

    for (let i = 0; i < emptyCells.length; i++) {
      const [r, c] = emptyCells[i];
      const valuesAtI = new Set(valid.map(combo => combo[i]));
      const cell = notations[r][c];
      const toRemove = cell.filter(d => !valuesAtI.has(d));
      if (toRemove.length) {
        notations[r][c] = cell.filter(d => valuesAtI.has(d));
        return [updateNotations(notations), true];
      }
    }
  }
  return [notations, false];
}

export function isSolved(matrix) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (matrix[i][j] === 0 || isList(matrix[i][j])) return false;
    }
  }
  return true;
}

export function printBoard(board) {
  for (const row of board) console.log(row);
}

// ---------------------------------------------------------------
// Full solve loop — orchestrates every technique in priority order.
// Returns { notations, solved, steps, labels, log }.
// ---------------------------------------------------------------

const TECHNIQUES = [
  ['last_digit', 'last digit', lastDigit],
  ['last_twin', 'last twin', lastTwin],
  ['orthogonal_naked_single', 'orthogonal naked single', orthogonalNakedSingle],
  ['naked_single', 'naked single', nakedSingle],
  ['box_hs', 'hidden single (box)', hiddenSingleBox],
  ['box_ht', 'hidden twin (box)', hiddenTwinBox],
  ['line_hs', 'hidden single (line)', hiddenSingleLine],
  ['line_ht', 'hidden twin (line)', hiddenTwinLine],
  ['almost_ht_corner', 'almost hidden twin (corner)', almostHiddenTwinCorner],
  ['almost_ht_separated', 'almost hidden twin (separated)', almostHiddenTwinSeparated],
  ['intersection_basic', 'intersection (basic)', intersectionBasic],
  ['intersection_advanced', 'intersection (advanced)', intersectionAdvanced],
  ['diamond', 'diamond', diamond],
  ['united_naked_pair', 'united naked pair', unitedNakedPair],
];

// Keys used for the two combinations variants (handled separately since
// they're parameterized by size).
const COMBO_BASIC_KEY = 'combinations_basic';
const COMBO_ADVANCED_KEY = 'combinations_advanced';

/** All valid technique keys, for reference / building limits objects. */
export const TECHNIQUE_KEYS = [...TECHNIQUES.map(([key]) => key), COMBO_BASIC_KEY, COMBO_ADVANCED_KEY];

/**
 * Solves as far as possible using the technique chain.
 *
 * Options:
 *   - verbose: console-print each step (default false)
 *   - limits: optional object capping how many times each technique may
 *     be *used*, keyed by technique key (see TECHNIQUE_KEYS), e.g.
 *     { last_digit: 999, box_hs: 999, combinations_basic: 5 }.
 *     A technique missing from `limits` is treated as unlimited.
 *     'combinations' is also accepted as shorthand for capping both
 *     combinations_basic and combinations_advanced together.
 *     Once a technique hits its cap, solve() stops trying it — if that
 *     makes progress stall, the solve ends there (possibly unsolved).
 *
 * Returns { notations, solved, counts, log }, where `counts` is a
 * { [techniqueKey]: number } map of how many times each technique fired.
 */
export function solve(puzzleString, { verbose = false, limits = null } = {}) {
  const matrix = convertToMatrix(puzzleString);
  let notations = addNotations(matrix);

  const counts = Object.fromEntries(TECHNIQUE_KEYS.map(key => [key, 0]));
  const log = [];

  function limitFor(key) {
    if (!limits) return Infinity;
    if (key in limits) return limits[key];
    if ((key === COMBO_BASIC_KEY || key === COMBO_ADVANCED_KEY) && 'combinations' in limits) {
      return limits.combinations;
    }
    return Infinity;
  }

  function comboUsedTotal() {
    return counts[COMBO_BASIC_KEY] + counts[COMBO_ADVANCED_KEY];
  }

  let stepNum = 1;
  outer: while (true) {
    for (const [key, label, fn] of TECHNIQUES) {
      if (counts[key] >= limitFor(key)) continue;
      const [next, changed] = fn(notations);
      if (changed) {
        notations = next;
        counts[key]++;
        log.push({ step: stepNum++, technique: key, label, board: deepClone(notations) });
        if (verbose) {
          console.log(`\nAfter ${label} Step ${stepNum - 1}:`);
          printBoard(notations);
        }
        continue outer;
      }
    }

    const comboBasicLimit = limitFor(COMBO_BASIC_KEY);
    const comboBasicCombinedLimit = limits && 'combinations' in limits ? limits.combinations : Infinity;
    if (counts[COMBO_BASIC_KEY] < comboBasicLimit && comboUsedTotal() < comboBasicCombinedLimit) {
      let found = false;
      for (let size = 3; size <= 6; size++) {
        const [next, changed] = combinationsBasic(notations, size);
        if (changed) {
          notations = next;
          found = true;
          break;
        }
      }
      if (found) {
        counts[COMBO_BASIC_KEY]++;
        log.push({ step: stepNum++, technique: COMBO_BASIC_KEY, label: 'combinations (basic)', board: deepClone(notations) });
        continue;
      }
    }

    const comboAdvancedLimit = limitFor(COMBO_ADVANCED_KEY);
    const comboAdvancedCombinedLimit = limits && 'combinations' in limits ? limits.combinations : Infinity;
    if (counts[COMBO_ADVANCED_KEY] < comboAdvancedLimit && comboUsedTotal() < comboAdvancedCombinedLimit) {
      let found = false;
      for (let size = 3; size <= 6; size++) {
        const [next, changed] = combinationsAdvanced(notations, size);
        if (changed) {
          notations = next;
          found = true;
          break;
        }
      }
      if (found) {
        counts[COMBO_ADVANCED_KEY]++;
        log.push({ step: stepNum++, technique: COMBO_ADVANCED_KEY, label: 'combinations (advanced)', board: deepClone(notations) });
        continue;
      }
    }

    break;
  }

  return {
    notations,
    solved: isSolved(notations),
    counts,
    log,
  };
}

// =================================================================
// EXTRA FUNCTIONS (not in the original Python — added for convenience)
// =================================================================

/** Convert an 8x8 matrix (ints only, no notation lists) back to a 64-char string. */
export function matrixToString(matrix) {
  return matrix.map(row => row.map(cell => (isInt(cell) ? cell : 0)).join('')).join('');
}

/** Pretty-print the board as a human-readable grid string (ints and notation lists both handled). */
export function boardToDisplayString(board) {
  return board
    .map(row =>
      row
        .map(cell => (isInt(cell) ? String(cell) : `[${cell.join('')}]`))
        .join(' ')
    )
    .join('\n');
}

/**
 * Validate that a fully-solved board actually satisfies every constraint
 * (row/col/region counts of 2 each, and no orthogonal duplicates).
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateSolution(matrix) {
  const errors = [];

  for (let i = 0; i < 8; i++) {
    const counts = {};
    for (let j = 0; j < 8; j++) {
      const v = matrix[i][j];
      if (!isInt(v)) { errors.push(`Row ${i} cell ${j} is not resolved`); continue; }
      counts[v] = (counts[v] || 0) + 1;
    }
    for (const d of [1, 2, 3, 4]) {
      if (counts[d] !== 2) errors.push(`Row ${i}: digit ${d} appears ${counts[d] || 0} times (expected 2)`);
    }
  }

  for (let j = 0; j < 8; j++) {
    const counts = {};
    for (let i = 0; i < 8; i++) {
      const v = matrix[i][j];
      if (!isInt(v)) continue;
      counts[v] = (counts[v] || 0) + 1;
    }
    for (const d of [1, 2, 3, 4]) {
      if (counts[d] !== 2) errors.push(`Column ${j}: digit ${d} appears ${counts[d] || 0} times (expected 2)`);
    }
  }

  for (let regionRow = 0; regionRow < 8; regionRow += 2) {
    for (let regionCol = 0; regionCol < 8; regionCol += 4) {
      const counts = {};
      for (let r = regionRow; r < regionRow + 2; r++) {
        for (let c = regionCol; c < regionCol + 4; c++) {
          const v = matrix[r][c];
          if (!isInt(v)) continue;
          counts[v] = (counts[v] || 0) + 1;
        }
      }
      for (const d of [1, 2, 3, 4]) {
        if (counts[d] !== 2) errors.push(`Region (${regionRow},${regionCol}): digit ${d} appears ${counts[d] || 0} times (expected 2)`);
      }
    }
  }

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const v = matrix[i][j];
      if (!isInt(v)) continue;
      for (const [dr, dc] of directions) {
        const r = i + dr, c = j + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8 && matrix[r][c] === v) {
          errors.push(`Adjacent duplicate ${v} at (${i},${j}) and (${r},${c})`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a random *valid, filled* 8x8 board satisfying all placement
 * rules (row/col/region counts, adjacency), via randomized backtracking.
 * Useful as a starting point for puzzle generation.
 */
export function generateFilledBoard(maxAttempts = 200) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isPlacementValid(board, r, c, digit) {
    let rowCount = 0, colCount = 0, regionCount = 0;
    for (let j = 0; j < 8; j++) if (board[r][j] === digit) rowCount++;
    if (rowCount >= 2) return false;
    for (let i = 0; i < 8; i++) if (board[i][c] === digit) colCount++;
    if (colCount >= 2) return false;
    for (const [rr, cc] of getRegionIndices(r, c)) if (board[rr][cc] === digit) regionCount++;
    if (regionCount >= 2) return false;
    for (const [dr, dc] of directions) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === digit) return false;
    }
    return true;
  }

  function backtrack(board, pos) {
    if (pos === 64) return true;
    const r = Math.floor(pos / 8), c = pos % 8;
    for (const digit of shuffled([1, 2, 3, 4])) {
      if (isPlacementValid(board, r, c, digit)) {
        board[r][c] = digit;
        if (backtrack(board, pos + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const board = Array.from({ length: 8 }, () => Array(8).fill(0));
    if (backtrack(board, 0)) return board;
  }
  return null; // failed to generate within maxAttempts
}

/**
 * Returns the list of technique keys actually used to solve a puzzle,
 * in the order they were first needed (each key appears once). This is
 * the non-console equivalent of the step counter — just the data.
 * Use TECHNIQUE_KEYS to see all valid keys / human labels.
 */
export function countTechniques(puzzle) {
  const result = solve(puzzle);
  const seen = [];
  for (const entry of result.log) {
    if (!seen.includes(entry.technique)) seen.push(entry.technique);
  }
  return seen;
}

/**
 * Runs the technique chain a single time and returns the next step that
 * would be applied, without solving the whole puzzle. Returns null if no
 * technique can make progress (puzzle is solved or stuck).
 *
 * Return shape: { technique, label, board, cell: [r, c] | null }
 * `technique` is the snake_case key (see TECHNIQUE_KEYS), `label` is the
 * human-readable name. `cell` is the coordinate that changed, when it
 * can be determined from a simple diff between the before/after boards
 * (null for techniques that only purge candidates from multiple cells).
 */
export function hint(puzzle) {
  const matrix = convertToMatrix(puzzle);
  let notations = addNotations(matrix);

  if (isSolved(notations)) return null;

  const before = deepClone(notations);

  for (const [key, label, fn] of TECHNIQUES) {
    const [next, changed] = fn(notations);
    if (changed) {
      return { technique: key, label, board: next, cell: diffSingleCell(before, next) };
    }
  }

  for (let size = 3; size <= 6; size++) {
    const [next, changed] = combinationsBasic(notations, size);
    if (changed) {
      return { technique: COMBO_BASIC_KEY, label: 'combinations (basic)', board: next, cell: diffSingleCell(before, next) };
    }
  }

  for (let size = 3; size <= 6; size++) {
    const [next, changed] = combinationsAdvanced(notations, size);
    if (changed) {
      return { technique: COMBO_ADVANCED_KEY, label: 'combinations (advanced)', board: next, cell: diffSingleCell(before, next) };
    }
  }

  return null; // stuck — no technique could progress
}

/** Finds the single (r, c) that changed from int-resolution between two boards, or null if not a single-cell reveal. */
function diffSingleCell(before, after) {
  const resolved = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (isList(before[i][j]) && isInt(after[i][j])) resolved.push([i, j]);
    }
  }
  return resolved.length === 1 ? resolved[0] : null;
}

/**
 * Generates a puzzle solvable within a per-technique usage budget.
 *
 * `limits` is an object keyed by technique key capping how many times
 * that technique may fire while solving, e.g.:
 *   { last_digit: 999, box_hs: 999, combinations: 5 }
 * Keys not mentioned are treated as unlimited. 'combinations' is
 * shorthand covering both combinations_basic and combinations_advanced
 * together (see TECHNIQUE_KEYS for the full list of valid keys).
 *
 * Internally generates a random filled board, then strips clues one at
 * a time, keeping each removal only if `solve(candidate, { limits })`
 * still fully solves the puzzle within budget.
 *
 * Options:
 *   - minClues: floor on how many clues to keep (default 16)
 *   - maxAttempts: how many random filled boards to try if stripping
 *     stalls out (default 10)
 *
 * Returns the puzzle string, or null if no puzzle meeting the
 * constraint could be generated.
 */
export function generatePuzzle(limits, { minClues = 16, maxAttempts = 10 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solvedBoard = generateFilledBoard();
    if (!solvedBoard) continue;

    const board = deepClone(solvedBoard);
    const cellOrder = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) cellOrder.push([i, j]);
    for (let i = cellOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cellOrder[i], cellOrder[j]] = [cellOrder[j], cellOrder[i]];
    }

    let clueCount = 64;
    for (const [r, c] of cellOrder) {
      if (clueCount <= minClues) break;
      const backup = board[r][c];
      board[r][c] = 0;
      clueCount--;

      const candidateString = matrixToString(board);
      const result = solve(candidateString, { limits });

      if (!result.solved) {
        // can't be solved within this technique budget — revert
        board[r][c] = backup;
        clueCount++;
      }
    }

    const finalString = matrixToString(board);
    const finalResult = solve(finalString, { limits });
    if (finalResult.solved) {
      return finalString;
    }
    // else try another random filled board
  }

  return null;
}

/** Count how many cells are still unresolved (notation lists) in a board. */
export function countUnresolved(board) {
  let count = 0;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (isList(board[i][j])) count++;
  return count;
}

/** Return the total number of remaining candidates across all unresolved cells (a rough "difficulty" proxy). */
export function totalCandidateCount(board) {
  let total = 0;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      if (isList(board[i][j])) total += board[i][j].length;
  return total;
}

export default {
  TECHNIQUE_KEYS,
  convertToMatrix,
  addNotations,
  getRegionIndices,
  updateNotations,
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
  isSolved,
  printBoard,
  solve,
  matrixToString,
  boardToDisplayString,
  validateSolution,
  generateFilledBoard,
  generatePuzzle,
  countUnresolved,
  totalCandidateCount,
  countTechniques,
  hint,
};
