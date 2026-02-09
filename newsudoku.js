/**
 * newsudoku.js
 * Core functionality for generating, solving (using singles), and validating
 * Sudoku puzzles, translated from Python.
 */

// --- Helper Functions ---

/**
 * Converts a single 81-character string into a 9x9 array (matrix).
 * Assumes the string contains only digits '0'-'9'.
 */
function convertToMatrix(sudokuString) {
    if (sudokuString.length !== 81) {
        throw new Error("Sudoku string must be exactly 81 characters long.");
    }

    const matrix = [];
    for (let i = 0; i < 9; i++) {
        const rowString = sudokuString.substring(i * 9, (i + 1) * 9);
        // Convert each character (which is a digit) to an integer
        const row = Array.from(rowString).map(char => parseInt(char, 10));
        matrix.push(row);
    }

    return matrix;
}

/**
 * Converts the 9x9 board array into a single 81-character string.
 */
function convertToString(matrix) {
    return matrix.flat().join("");
}

/**
 * Deep copies a 9x9 array.
 */
function deepCopyBoard(board) {
    return board.map(row => [...row]);
}

/**
 * Returns a new array containing digits 1 through 9.
 */
function range1To9() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

/**
 * Shuffles an array in place (using Fisher-Yates algorithm).
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Sudoku Logic: Full Random Solution Generator ---

function solveGridRandomBacktracking(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) {
                const possibleNums = shuffle(range1To9());

                for (let num of possibleNums) {
                    if (isValid(grid, r, c, num)) {
                        grid[r][c] = num;
                        if (solveGridRandomBacktracking(grid)) {
                            return true;
                        }
                        grid[r][c] = 0; // Backtrack
                    }
                }
                return false; // No number works for this cell
            }
        }
    }
    return true; // Grid is solved
}

function isValid(board, r, c, num) {
    // Row check
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
    }
    // Column check
    for (let i = 0; i < 9; i++) {
        if (board[i][c] === num) return false;
    }
    // Box check
    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
}

function generateSolutionRandom() {
    // Initialize an empty board
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveGridRandomBacktracking(solution);
    return solution;
}

// --- Sudoku Logic: Core Constraints ---

function getPossibleValues(board, row, col) {
    if (board[row][col] !== 0) return [];

    const used = new Set();
    // Row, Column, and Box check
    for (let i = 0; i < 9; i++) {
        if (board[row][i] !== 0) used.add(board[row][i]);
        if (board[i][col] !== 0) used.add(board[i][col]);
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (board[r][c] !== 0) used.add(board[r][c]);
        }
    }

    return range1To9().filter(num => !used.has(num));
}

function eliminatePossibilities(possibilities, rPlaced, cPlaced, valPlaced, puzzle) {
    let contradiction = false;

    // 1. Eliminate in the same row/col
    for (let i = 0; i < 9; i++) {
        // Row check
        if (possibilities[rPlaced][i].has(valPlaced)) {
            possibilities[rPlaced][i].delete(valPlaced);
            if (possibilities[rPlaced][i].size === 0 && puzzle[rPlaced][i] === 0) {
                contradiction = true;
            }
        }
        // Column check
        if (possibilities[i][cPlaced].has(valPlaced)) {
            possibilities[i][cPlaced].delete(valPlaced);
            if (possibilities[i][cPlaced].size === 0 && puzzle[i][cPlaced] === 0) {
                contradiction = true;
            }
        }
    }

    // 2. Eliminate in the 3x3 box
    const startRow = Math.floor(rPlaced / 3) * 3;
    const startCol = Math.floor(cPlaced / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (possibilities[r][c].has(valPlaced)) {
                possibilities[r][c].delete(valPlaced);
                if (possibilities[r][c].size === 0 && puzzle[r][c] === 0) {
                    contradiction = true;
                }
            }
        }
    }
    return contradiction;
}

// --- Sudoku Logic: Singles Techniques ---

function findHiddenSingles(puzzle, possibilities, unitType, unitIndex) {
    const updates = [];
    const unitPoss = {}; // Map number -> array of coords
    range1To9().forEach(num => unitPoss[num] = []);

    let coords = [];
    if (unitType === 'row') {
        for (let c = 0; c < 9; c++) coords.push([unitIndex, c]);
    } else if (unitType === 'col') {
        for (let r = 0; r < 9; r++) coords.push([r, unitIndex]);
    } else if (unitType === 'box') {
        const startRow = Math.floor(unitIndex / 3) * 3;
        const startCol = (unitIndex % 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) coords.push([r, c]);
        }
    }

    // Analyze the unit's possibilities
    for (let [r, c] of coords) {
        if (puzzle[r][c] === 0) {
            possibilities[r][c].forEach(num => unitPoss[num].push([r, c]));
        }
    }

    // Check for Hidden Singles
    for (let num in unitPoss) {
        const locations = unitPoss[num];
        if (locations.length === 1) {
            const [r, c] = locations[0];
            if (puzzle[r][c] === 0) {
                updates.push([r, c, parseInt(num, 10)]);
            }
        }
    }
    return updates;
}

function findNakedSingles(puzzle, possibilities) {
    const updates = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0 && possibilities[r][c].size === 1) {
                const val = possibilities[r][c].values().next().value;
                updates.push([r, c, val]);
            }
        }
    }
    return updates;
}

// --- Sudoku Logic: Core Solver Loop ---

function findAndApplyUpdates(techniqueType, puzzle, possibilities, emptyCellsCount) {
    let updates = [];

    if (techniqueType === 'BoxHS') {
        for (let i = 0; i < 9; i++) {
            updates.push(...findHiddenSingles(puzzle, possibilities, 'box', i));
        }
    } else if (techniqueType === 'LineHS') {
        for (let i = 0; i < 9; i++) {
            updates.push(...findHiddenSingles(puzzle, possibilities, 'row', i));
            updates.push(...findHiddenSingles(puzzle, possibilities, 'col', i));
        }
    } else if (techniqueType === 'NakedSingle') {
        updates.push(...findNakedSingles(puzzle, possibilities));
    }

    if (updates.length === 0) return [[], false];

    // Apply unique updates based on coordinates
    const uniqueUpdatesMap = new Map();
    updates.forEach(([r, c, val]) => uniqueUpdatesMap.set(`${r},${c}`, [r, c, val]));
    const uniqueUpdates = Array.from(uniqueUpdatesMap.values());

    let contradiction = false;
    for (let [r, c, val] of uniqueUpdates) {
        if (puzzle[r][c] === 0) {
            puzzle[r][c] = val;
            emptyCellsCount[0]--;

            if (eliminatePossibilities(possibilities, r, c, val, puzzle)) {
                contradiction = true;
            }
            possibilities[r][c] = new Set();
        }
    }
    return [uniqueUpdates, contradiction];
}

function solveWithSingles(board, returnDifficulty = false) {
    const puzzle = deepCopyBoard(board);
    let initialEmptyCells = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) initialEmptyCells++;
        }
    }

    let highestTechnique = 0;
    if (initialEmptyCells === 0) return returnDifficulty ? 0.0 : puzzle;

    // --- Initialization ---
    const possibilities = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    const emptyCellsCount = [0];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) {
                const possible = getPossibleValues(puzzle, r, c);
                if (possible.length === 0) return returnDifficulty ? -0.2 : board;
                possibilities[r][c] = new Set(possible);
                emptyCellsCount[0]++;
            }
        }
    }

    // --- Solving Loop ---
    let steps = 0;
    while (emptyCellsCount[0] > 0) {
        let contradiction = false;
        let foundUpdate = false;

        // 1. Box Hidden Single
        let [updates, contra] = findAndApplyUpdates('BoxHS', puzzle, possibilities, emptyCellsCount);
        if (updates.length > 0) {
            steps++;
            if (contra) { contradiction = true; break; }
            foundUpdate = true;
            continue;
        }

        highestTechnique = Math.max(1, highestTechnique);

        // 2. Line Hidden Single
        [updates, contra] = findAndApplyUpdates('LineHS', puzzle, possibilities, emptyCellsCount);
        if (updates.length > 0) {
            steps++;
            if (contra) { contradiction = true; break; }
            foundUpdate = true;
            continue;
        }

        highestTechnique = 2;

        // 3. Naked Single
        [updates, contra] = findAndApplyUpdates('NakedSingle', puzzle, possibilities, emptyCellsCount);
        if (updates.length > 0) {
            steps++;
            if (contra) { contradiction = true; break; }
            foundUpdate = true;
            continue;
        }

        break; // Stuck
    }

    // --- Final Check ---
    if (contradiction) {
        return returnDifficulty ? -0.2 : board;
    } else if (emptyCellsCount[0] === 0) {
        const difficulty = steps / initialEmptyCells;
        return returnDifficulty ? (difficulty + highestTechnique) / 3 : puzzle;
    } else {
        return returnDifficulty ? -0.1 : board;
    }
}

// --- Sudoku Generation Functions ---

function generateSudoku2(targetClues) {
    const solution = generateSolutionRandom();
    const puzzle = deepCopyBoard(solution);
    const indices = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) indices.push([r, c]);
    }
    shuffle(indices);

    let currentClues = 81;
    for (let [r, c] of indices) {
        const rSym = 8 - r;
        const cSym = 8 - c;

        if (puzzle[r][c] !== 0) {
            const backupR = puzzle[r][c];
            const backupRSym = puzzle[rSym][cSym];

            puzzle[r][c] = 0;
            currentClues--;
            let isSymmetric = (r !== rSym || c !== cSym);
            if (isSymmetric) {
                if (puzzle[rSym][cSym] !== 0) {
                    puzzle[rSym][cSym] = 0;
                    currentClues--;
                } else {
                    isSymmetric = false;
                }
            }

            const solvability = solveWithSingles(puzzle, true);
            if (solvability < 0 || currentClues < targetClues) {
                puzzle[r][c] = backupR;
                currentClues++;
                if (isSymmetric) {
                    puzzle[rSym][cSym] = backupRSym;
                    currentClues++;
                }
            }
        }
    }
    return puzzle;
}

function generateSudoku(minDifficulty, maxDifficulty, targetClues = 17, maxAttempts = 200) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        const attemptBoard = generateSudoku2(targetClues);
        const difficulty = solveWithSingles(attemptBoard, true);
        if (difficulty >= minDifficulty && difficulty <= maxDifficulty) {
            return attemptBoard;
        }
    }
    console.warn(`Warning: Failed to generate puzzle in range (${minDifficulty} to ${maxDifficulty}) after ${maxAttempts} attempts.`);
    return generateSudoku2(targetClues);
}

// --- Daily Puzzle Generation ---

function generateDailySudoku(date = new Date()) {
    // Generate seed based on YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const seed = parseInt(`${year}${month}${day}`, 10);
    
    // Simple seeded random generator
    let s = seed;
    const seededRandom = () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };

    // Replace Math.random temporarily to use seed
    const originalRandom = Math.random;
    Math.random = seededRandom;

    const minDiff = 0.1 + (seededRandom() * 0.4);
    const maxDiff = 0.5 + (seededRandom() * 0.3);
    const targetClues = 17 + Math.floor(seededRandom() * 33);
    
    const puzzle = generateSudoku(minDiff, maxDiff, targetClues);
    
    // Restore original random
    Math.random = originalRandom;
    return puzzle;
}

// --- Hint Helper Function ---

function getSortedHiddenSingleUpdate(puzzle, possibilities, unitType) {
    for (let num of range1To9()) {
        for (let unitIndex = 0; unitIndex < 9; unitIndex++) {
            let coords = [];
            if (unitType === 'row') {
                for (let c = 0; c < 9; c++) coords.push([unitIndex, c]);
            } else if (unitType === 'col') {
                for (let r = 0; r < 9; r++) coords.push([r, unitIndex]);
            } else if (unitType === 'box') {
                const startRow = Math.floor(unitIndex / 3) * 3;
                const startCol = (unitIndex % 3) * 3;
                for (let r = startRow; r < startRow + 3; r++) {
                    for (let c = startCol; c < startCol + 3; c++) coords.push([r, c]);
                }
            }

            const locations = [];
            for (let [r, c] of coords) {
                if (puzzle[r][c] === 0 && possibilities[r][c].has(num)) {
                    locations.push([r, c]);
                }
            }

            if (locations.length === 1) {
                const [r, c] = locations[0];
                return [r, c, num];
            }
        }
    }
    return null;
}

function hint(sudoku, priority = 0) {
    const puzzle = deepCopyBoard(sudoku);
    const possibilities = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    const emptyCells = [];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) {
                const possible = getPossibleValues(puzzle, r, c);
                if (possible.length === 0) return ["Contradiction", [r, c], 0];
                possibilities[r][c] = new Set(possible);
                emptyCells.push([r, c]);
            }
        }
    }

    if (emptyCells.length === 0) return ["Solved", [-1, -1], 0];

    const techniqueOrder = priority === 1
        ? [["Naked Single", null], ["Box HS", 'box'], ["Line HS", 'row_col']]
        : [["Box HS", 'box'], ["Line HS", 'row_col'], ["Naked Single", null]];

    for (let [techName, unitType] of techniqueOrder) {
        if (techName === "Naked Single") {
            const updates = findNakedSingles(puzzle, possibilities);
            if (updates.length > 0) {
                const [r, c, val] = updates[0];
                return ["Naked Single", [r, c], val];
            }
        } else if (unitType === 'box') {
            const update = getSortedHiddenSingleUpdate(puzzle, possibilities, 'box');
            if (update) return ["Box HS", [update[0], update[1]], update[2]];
        } else if (unitType === 'row_col') {
            const rowUpdate = getSortedHiddenSingleUpdate(puzzle, possibilities, 'row');
            if (rowUpdate) return ["Line HS", [rowUpdate[0], rowUpdate[1]], rowUpdate[2]];
            const colUpdate = getSortedHiddenSingleUpdate(puzzle, possibilities, 'col');
            if (colUpdate) return ["Line HS", [colUpdate[0], colUpdate[1]], colUpdate[2]];
        }
    }

    if (priority === 0) {
        let bestCell = null;
        let minPossibilities = 10;
        for (let [r, c] of emptyCells) {
            const numPossibilities = possibilities[r][c].size;
            if (numPossibilities > 1 && numPossibilities < minPossibilities) {
                minPossibilities = numPossibilities;
                bestCell = [r, c];
            }
        }
        if (bestCell) {
            const [r, c] = bestCell;
            const vals = Array.from(possibilities[r][c]);
            const val = vals[Math.floor(Math.random() * vals.length)];
            return ["Guess", [r, c], val];
        }
    }

    return ["Stuck", [-1, -1], 0];
}

// Export functions for use in other files
export {
    convertToMatrix,
    convertToString,
    solveWithSingles,
    generateSudoku,
    generateDailySudoku,
    hint,
    solveGridRandomBacktracking
};
