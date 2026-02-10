/**
 * newsudoku.js
 * Core functionality for generating, solving (using singles), and validating
 * Sudoku puzzles.
 * 
 * Direct JavaScript port of sudoku.py with exact logic preservation.
 */

// --- Utility Functions ---

function convertToMatrix(sudokuString) {
    /**
     * Converts a single 81-character string into a 9x9 array (matrix).
     * Assumes the string contains only digits '0'-'9'.
     */
    if (sudokuString.length !== 81) {
        throw new Error("Sudoku string must be exactly 81 characters long.");
    }
    
    const matrix = [];
    for (let i = 0; i < 9; i++) {
        const rowStart = i * 9;
        const rowEnd = (i + 1) * 9;
        const rowString = sudokuString.substring(rowStart, rowEnd);
        // Convert each character (which is a digit) to an integer
        const row = Array.from(rowString, char => parseInt(char));
        matrix.push(row);
    }
    
    return matrix;
}

function range1To9() {
    /**
     * Returns a deterministic list of digits 1 through 9.
     */
    return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function shuffle(array) {
    /**
     * Shuffles an array in place (Fisher-Yates shuffle).
     */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getBoxIndex(row, col) {
    /**
     * Returns the 3x3 box index (0-8).
     */
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function deepCopyBoard(board) {
    /**
     * Deep copies a 9x9 array.
     */
    return board.map(row => [...row]);
}

function convertToString(array) {
    /**
     * Converts the 9x9 board array into a single 81-character string.
     */
    return array.flat().join('');
}

// --- Sudoku Logic: Full Random Solution Generator ---

function solveGridRandomBacktracking(grid) {
    /**
     * Randomized backtracking function to fill a complete Sudoku grid.
     * Returns true if a solution is found, false otherwise.
     */
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) {
                // Get possible values and shuffle them for randomization
                const possibleNums = range1To9();
                shuffle(possibleNums);
                
                for (const num of possibleNums) {
                    // Check if the number is valid in the current context
                    let isValid = true;
                    
                    // Row check
                    if (grid[r].includes(num)) {
                        isValid = false;
                    }
                    
                    // Column check
                    if (isValid) {
                        for (let i = 0; i < 9; i++) {
                            if (grid[i][c] === num) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                    
                    // Box check
                    if (isValid) {
                        const startRow = Math.floor(r / 3) * 3;
                        const startCol = Math.floor(c / 3) * 3;
                        for (let rowBox = startRow; rowBox < startRow + 3; rowBox++) {
                            for (let colBox = startCol; colBox < startCol + 3; colBox++) {
                                if (grid[rowBox][colBox] === num) {
                                    isValid = false;
                                    break;
                                }
                            }
                            if (!isValid) break;
                        }
                    }
                    
                    if (isValid) {
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

function generateSolutionRandom() {
    /**
     * Generates a fully solved, truly random Sudoku grid using backtracking.
     */
    // Initialize an empty board
    const solution = Array(9).fill(null).map(() => Array(9).fill(0));
    
    // Use the randomized backtracking solver to fill it
    solveGridRandomBacktracking(solution);
    
    return solution;
}

// --- Sudoku Logic: Core Constraints ---

function getPossibleValues(board, row, col) {
    /**
     * Returns a list of numbers (1-9) that can be placed at (row, col)
     * based on row, column, and 3x3 box constraints.
     */
    if (board[row][col] !== 0) {
        return [];
    }

    const used = new Set();
    
    // Check row
    for (let c = 0; c < 9; c++) {
        used.add(board[row][c]);
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
        used.add(board[r][col]);
    }
    
    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            used.add(board[r][c]);
        }
    }
    
    const possible = [];
    for (let num = 1; num <= 9; num++) {
        if (!used.has(num)) {
            possible.push(num);
        }
    }
    
    return possible;
}

function eliminatePossibilities(possibilities, rPlaced, cPlaced, valPlaced, puzzle) {
    /**
     * Updates the possibilities matrix after placing a 'valPlaced' at (rPlaced, cPlaced).
     * Returns true if any empty cell now has 0 possibilities (contradiction).
     */
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
    /**
     * Finds ALL Hidden Singles within a single unit ('row', 'col', or 'box').
     * (Used by the main solver, not the hint function.)
     * Returns: array of [r, c, val] tuples.
     */
    const updates = [];
    const allNums = range1To9();
    const unitPoss = {};
    
    for (const num of allNums) {
        unitPoss[num] = [];
    }
    
    // Determine coordinates based on unit type
    let coords = [];
    if (unitType === 'row') {
        coords = Array(9).fill(null).map((_, c) => [unitIndex, c]);
    } else if (unitType === 'col') {
        coords = Array(9).fill(null).map((_, r) => [r, unitIndex]);
    } else if (unitType === 'box') {
        const startRow = Math.floor(unitIndex / 3) * 3;
        const startCol = (unitIndex % 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                coords.push([r, c]);
            }
        }
    }
    
    // Analyze the unit's possibilities
    for (const [r, c] of coords) {
        if (puzzle[r][c] === 0) {
            for (const num of possibilities[r][c]) {
                unitPoss[num].push([r, c]);
            }
        }
    }
    
    // Check for Hidden Singles
    for (const [num, locations] of Object.entries(unitPoss)) {
        if (locations.length === 1) {
            const [r, c] = locations[0];
            if (puzzle[r][c] === 0) {
                updates.push([r, c, parseInt(num)]);
            }
        }
    }
    
    return updates;
}

function findNakedSingles(puzzle, possibilities) {
    /**
     * Finds Naked Singles in all cells.
     * Returns: array of [r, c, val] tuples.
     */
    const updates = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0 && possibilities[r][c].size === 1) {
                const val = [...possibilities[r][c]][0];
                updates.push([r, c, val]);
            }
        }
    }
    return updates;
}

// --- Sudoku Logic: Core Solver Loop (Strict Priority) ---

function findAndApplyUpdates(techniqueType, puzzle, possibilities, emptyCellsCount) {
    /**
     * Finds and applies all singles of a specific type (BoxHS, LineHS, NakedSingle).
     */
    let updates = [];
    
    if (techniqueType === 'BoxHS') {
        for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
            const boxUpdates = findHiddenSingles(puzzle, possibilities, 'box', boxIdx);
            updates = updates.concat(boxUpdates);
        }
    } else if (techniqueType === 'LineHS') {
        for (let idx = 0; idx < 9; idx++) {
            const rowUpdates = findHiddenSingles(puzzle, possibilities, 'row', idx);
            const colUpdates = findHiddenSingles(puzzle, possibilities, 'col', idx);
            updates = updates.concat(rowUpdates, colUpdates);
        }
    } else if (techniqueType === 'NakedSingle') {
        updates = findNakedSingles(puzzle, possibilities);
    }
    
    if (updates.length === 0) {
        return [emptyCellsCount, false];
    }
    
    // Make updates unique (remove duplicates)
    const uniqueUpdates = [];
    const seen = new Set();
    for (const [r, c, val] of updates) {
        const key = `${r},${c},${val}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueUpdates.push([r, c, val]);
        }
    }
    
    // Apply all unique updates for this technique
    let contradiction = false;
    for (const [r, c, val] of uniqueUpdates) {
        if (puzzle[r][c] === 0) {
            puzzle[r][c] = val;
            emptyCellsCount--;
            
            // Update possibilities for neighbors and check for contradiction
            if (eliminatePossibilities(possibilities, r, c, val, puzzle)) {
                contradiction = true;
            }
            
            // Mark the current cell as solved
            possibilities[r][c] = new Set();
        }
    }
    
    return [emptyCellsCount, contradiction];
}

function solveWithSingles(sudoku, returnDifficulty = false) {
    /**
     * Solves a Sudoku puzzle using only singles techniques (Box HS -> Line HS -> Naked Single).
     * 
     * If returnDifficulty is true:
     *   Returns difficulty score or -0.1 if stuck, -0.2 if contradiction
     * If returnDifficulty is false:
     *   Returns the solved puzzle or original board if stuck/invalid
     */
    const puzzle = deepCopyBoard(sudoku);
    const initialEmptyCells = puzzle.flat().filter(x => x === 0).length;
    let highestTechnique = 0;
    
    if (initialEmptyCells === 0) {
        return returnDifficulty ? 0.0 : puzzle;
    }
    
    // Initialize possibilities
    const possibilities = Array(9).fill(null).map(() => 
        Array(9).fill(null).map(() => new Set())
    );
    
    let emptyCellsCount = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) {
                possibilities[r][c] = new Set(getPossibleValues(puzzle, r, c));
                if (possibilities[r][c].size === 0) {
                    return returnDifficulty ? -0.2 : sudoku;
                }
                emptyCellsCount++;
            } else {
                possibilities[r][c] = new Set();
            }
        }
    }
    
    // Solving loop with STRICT priority (Box HS -> Line HS -> Naked Single)
    let steps = 0;
    
    while (emptyCellsCount > 0) {
        let updates = [];
        let contradiction = false;
        
        // 1. Box Hidden Single
        [emptyCellsCount, contradiction] = findAndApplyUpdates('BoxHS', puzzle, possibilities, emptyCellsCount);
        const boxUpdates = emptyCellsCount < initialEmptyCells - steps;
        if (boxUpdates) {
            steps++;
            if (contradiction) break;
            continue;
        }
        
        highestTechnique = Math.max(1, highestTechnique);
        
        // 2. Line Hidden Single
        const prevCount = emptyCellsCount;
        [emptyCellsCount, contradiction] = findAndApplyUpdates('LineHS', puzzle, possibilities, emptyCellsCount);
        if (emptyCellsCount < prevCount) {
            steps++;
            if (contradiction) break;
            continue;
        }
        
        highestTechnique = 2;
        
        // 3. Naked Single
        const prevCount2 = emptyCellsCount;
        [emptyCellsCount, contradiction] = findAndApplyUpdates('NakedSingle', puzzle, possibilities, emptyCellsCount);
        if (emptyCellsCount < prevCount2) {
            steps++;
            if (contradiction) break;
            continue;
        }
        
        // Stuck
        break;
    }
    
    // Final check and return
    if (contradiction) {
        return returnDifficulty ? -0.2 : sudoku;
    } else if (emptyCellsCount === 0) {
        // Fully solved
        const difficulty = initialEmptyCells > 0 ? steps / initialEmptyCells : 0.0;
        return returnDifficulty ? (difficulty + highestTechnique) / 3 : puzzle;
    } else {
        // Stuck, requires advanced techniques
        return returnDifficulty ? -0.1 : sudoku;
    }
}

// --- Sudoku Generation ---

function generateSudoku(minDifficulty, maxDifficulty, targetClues = 25, maxAttempts = 100) {
    /**
     * Generates a Sudoku puzzle with difficulty in [minDifficulty, maxDifficulty].
     * Uses truly random solution generation.
     */
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate a random complete solution
        const solution = generateSolutionRandom();
        const puzzle = deepCopyBoard(solution);
        
        // Create list of all cell positions
        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push([r, c]);
            }
        }
        shuffle(positions);
        
        // Remove cells while maintaining solvability
        let cluesRemaining = 81;
        
        for (const [r, c] of positions) {
            if (cluesRemaining <= targetClues) break;
            
            const originalValue = puzzle[r][c];
            puzzle[r][c] = 0;
            
            // Check if still solvable with singles
            const difficulty = solveWithSingles(puzzle, true);
            
            if (difficulty < 0) {
                // Not solvable, restore the cell
                puzzle[r][c] = originalValue;
            } else {
                cluesRemaining--;
                
                // Check if we've reached desired difficulty range
                if (cluesRemaining <= targetClues && 
                    difficulty >= minDifficulty && 
                    difficulty <= maxDifficulty) {
                    return puzzle;
                }
            }
        }
        
        // Check final difficulty
        const finalDifficulty = solveWithSingles(puzzle, true);
        if (finalDifficulty >= minDifficulty && 
            finalDifficulty <= maxDifficulty && 
            cluesRemaining <= targetClues + 5) {
            return puzzle;
        }
    }
    
    // Fallback: return a solvable puzzle even if not in exact difficulty range
    const solution = generateSolutionRandom();
    const puzzle = deepCopyBoard(solution);
    const positions = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            positions.push([r, c]);
        }
    }
    shuffle(positions);
    
    let cluesRemaining = 81;
    for (const [r, c] of positions) {
        if (cluesRemaining <= targetClues) break;
        
        const originalValue = puzzle[r][c];
        puzzle[r][c] = 0;
        
        const difficulty = solveWithSingles(puzzle, true);
        if (difficulty < 0) {
            puzzle[r][c] = originalValue;
        } else {
            cluesRemaining--;
        }
    }
    
    return puzzle;
}

function generateDailySudoku(date) {
    /**
     * Generates a deterministic daily Sudoku puzzle based on the date.
     * Uses a seeded random generator for reproducibility.
     */
    // Create a seed from the date
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = hashCode(dateString);
    
    // Save current Math.random
    const originalRandom = Math.random;
    
    // Use seeded random
    Math.random = seededRandom(seed);
    
    // Generate puzzle
    const puzzle = generateSudoku(0.3, 0.7, 30);
    
    // Restore original Math.random
    Math.random = originalRandom;
    
    return puzzle;
}

// Helper function for seeded random
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// --- Hint System ---

function getSortedHiddenSingleUpdate(puzzle, possibilities, unitType) {
    /**
     * Finds the first Hidden Single by iterating through digits (1-9) first,
     * then unit indices (0-8).
     * Returns [r, c, val] or null.
     */
    for (const num of range1To9()) {
        for (let unitIndex = 0; unitIndex < 9; unitIndex++) {
            // Determine coordinates based on unit type
            let coords = [];
            if (unitType === 'row') {
                coords = Array(9).fill(null).map((_, c) => [unitIndex, c]);
            } else if (unitType === 'col') {
                coords = Array(9).fill(null).map((_, r) => [r, unitIndex]);
            } else if (unitType === 'box') {
                const startRow = Math.floor(unitIndex / 3) * 3;
                const startCol = (unitIndex % 3) * 3;
                for (let r = startRow; r < startRow + 3; r++) {
                    for (let c = startCol; c < startCol + 3; c++) {
                        coords.push([r, c]);
                    }
                }
            }
            
            // Analyze the unit's possibilities for *only* the current 'num'
            const locations = [];
            for (const [r, c] of coords) {
                if (puzzle[r][c] === 0 && possibilities[r][c].has(num)) {
                    locations.push([r, c]);
                }
            }
            
            // Check for Hidden Single: the digit appears only once in this unit
            if (locations.length === 1) {
                const [r, c] = locations[0];
                return [r, c, num];
            }
        }
    }
    
    return null;
}

function hint(sudoku, priority = 0) {
    /**
     * Provides the next logical step (hint) based on a priority order.
     * 
     * priority=0: Box HS -> Line HS -> Naked Single (Standard)
     * priority=1: Naked Single -> Box HS -> Line HS (Easier singles first)
     * 
     * Format: [technique, [r, c], digit]
     */
    const puzzle = deepCopyBoard(sudoku);
    
    // --- 1. Initialize Possibilities (needed for all techniques) ---
    const possibilities = Array(9).fill(null).map(() => 
        Array(9).fill(null).map(() => new Set())
    );
    const emptyCells = [];
    
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) {
                possibilities[r][c] = new Set(getPossibleValues(puzzle, r, c));
                if (possibilities[r][c].size === 0) {
                    return ["Contradiction", [r, c], 0];
                }
                emptyCells.push([r, c]);
            }
        }
    }
    
    if (emptyCells.length === 0) {
        return ["Solved", [-1, -1], 0];
    }
    
    // --- 2. Define Technique Order based on priority ---
    let techniqueOrder;
    
    if (priority === 1) {
        // Priority 1: Naked Single -> Box HS -> Line HS
        techniqueOrder = [
            ["Naked Single", null],
            ["Box HS", 'box'],
            ["Line HS", 'row_col']
        ];
    } else {
        // Default priority 0: Box HS -> Line HS -> Naked Single
        techniqueOrder = [
            ["Box HS", 'box'],
            ["Line HS", 'row_col'],
            ["Naked Single", null]
        ];
    }
    
    // --- 3. Execute Techniques in Order ---
    for (const [techniqueName, unitType] of techniqueOrder) {
        let update = null;
        
        if (techniqueName === "Naked Single") {
            const updates = findNakedSingles(puzzle, possibilities);
            if (updates.length > 0) {
                const [r, c, val] = updates[0];
                return ["Naked Single", [r, c], val];
            }
        } else if (unitType === 'box') {
            // Box HS: Finds the first one by digit (1-9) then box index (0-8)
            update = getSortedHiddenSingleUpdate(puzzle, possibilities, 'box');
            if (update) {
                const [r, c, val] = update;
                return ["Box HS", [r, c], val];
            }
        } else if (unitType === 'row_col') {
            // Line HS (Row): Finds the first one by digit (1-9) then row index (0-8)
            update = getSortedHiddenSingleUpdate(puzzle, possibilities, 'row');
            if (update) {
                const [r, c, val] = update;
                return ["Line HS", [r, c], val];
            }
            
            // Line HS (Column): Finds the first one by digit (1-9) then col index (0-8)
            update = getSortedHiddenSingleUpdate(puzzle, possibilities, 'col');
            if (update) {
                const [r, c, val] = update;
                return ["Line HS", [r, c], val];
            }
        }
    }
    
    // --- 4. Guess (Fallback if stuck) ---
    if (priority === 0) {
        // Find the cell with the fewest possibilities for an educated guess
        let bestCell = null;
        let minPossibilities = 10;
        
        for (const [r, c] of emptyCells) {
            const numPossibilities = possibilities[r][c].size;
            if (numPossibilities > 1 && numPossibilities < minPossibilities) {
                minPossibilities = numPossibilities;
                bestCell = [r, c];
            }
        }
        
        if (bestCell) {
            const [r, c] = bestCell;
            const possArray = [...possibilities[r][c]];
            const val = possArray[Math.floor(Math.random() * possArray.length)];
            return ["Guess", [r, c], val];
        }
    }
    
    // If the puzzle is stuck and we didn't guess
    return ["Stuck", [-1, -1], 0];
}

// --- Export Functions ---
// For use with <script src="newsudoku.js">
if (typeof window !== 'undefined') {
    window.Sudoku = {
        convertToMatrix,
        convertToString,
        range1To9,
        shuffle,
        getBoxIndex,
        deepCopyBoard,
        generateSolutionRandom,
        getPossibleValues,
        solveWithSingles,
        generateSudoku,
        generateDailySudoku,
        hint
    };
}

// For use with Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertToMatrix,
        convertToString,
        range1To9,
        shuffle,
        getBoxIndex,
        deepCopyBoard,
        generateSolutionRandom,
        getPossibleValues,
        solveWithSingles,
        generateSudoku,
        generateDailySudoku,
        hint
    };
}
