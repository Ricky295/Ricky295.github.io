/**
 * newsudoku6x6.js - Fixed version for 6x6 Sudoku with 2x3 boxes
 * Core functionality for 6x6 Sudoku with 2x3 boxes (2 rows × 3 columns).
 */

// --- Utility Functions ---

function convertToMatrix6x6(sudokuString) {
    if (sudokuString.length !== 36) {
        throw new Error("Sudoku string must be exactly 36 characters long.");
    }
    const matrix = [];
    for (let i = 0; i < 6; i++) {
        const rowStart = i * 6;
        const rowEnd = (i + 1) * 6;
        const rowString = sudokuString.substring(rowStart, rowEnd);
        const row = Array.from(rowString, char => parseInt(char));
        matrix.push(row);
    }
    return matrix;
}

function range1To6_internal() {
    return [1, 2, 3, 4, 5, 6];
}

function shuffle6x6(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getBoxIndex6x6(row, col) {
    // 3x2 boxes: 3 rows × 2 columns (horizontal boxes)
    // Box layout:
    // [0][1][2]
    // [3][4][5]
    return Math.floor(row / 3) * 3 + Math.floor(col / 2);
}

function deepCopyBoard6x6(board) {
    return board.map(row => [...row]);
}

function convertToString6x6(array) {
    return array.flat().join('');
}

// --- Sudoku Logic: Full Random Solution Generator ---

function solveGridRandomBacktracking6x6(grid) {
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (grid[r][c] === 0) {
                const possibleNums = range1To6_internal();
                shuffle6x6(possibleNums);
                
                for (const num of possibleNums) {
                    let isValid = true;
                    
                    // Row check
                    if (grid[r].includes(num)) {
                        isValid = false;
                    }
                    
                    // Column check
                    if (isValid) {
                        for (let i = 0; i < 6; i++) {
                            if (grid[i][c] === num) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                    
                    // Box check (3 rows × 2 columns)
                    if (isValid) {
                        const startRow = Math.floor(r / 3) * 3;
                        const startCol = Math.floor(c / 2) * 2;
                        for (let rowBox = startRow; rowBox < startRow + 3; rowBox++) {
                            for (let colBox = startCol; colBox < startCol + 2; colBox++) {
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
                        if (solveGridRandomBacktracking6x6(grid)) {
                            return true;
                        }
                        grid[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function generateSolutionRandom6x6() {
    const solution = Array(6).fill(null).map(() => Array(6).fill(0));
    solveGridRandomBacktracking6x6(solution);
    return solution;
}

// --- Sudoku Logic: Core Constraints ---

function getPossibleValues6x6(board, row, col) {
    if (board[row][col] !== 0) {
        return [];
    }

    const used = new Set();
    
    // Check row
    for (let c = 0; c < 6; c++) {
        used.add(board[row][c]);
    }
    
    // Check column
    for (let r = 0; r < 6; r++) {
        used.add(board[r][col]);
    }
    
    // Check 3x2 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 2) * 2;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 2; c++) {
            used.add(board[r][c]);
        }
    }
    
    const possible = [];
    for (let num = 1; num <= 6; num++) {
        if (!used.has(num)) {
            possible.push(num);
        }
    }
    
    return possible;
}

function eliminatePossibilities6x6(possibilities, rPlaced, cPlaced, valPlaced, puzzle) {
    let contradiction = false;
    
    // Eliminate in row and column
    for (let i = 0; i < 6; i++) {
        // Row
        if (possibilities[rPlaced][i].has(valPlaced)) {
            possibilities[rPlaced][i].delete(valPlaced);
            if (possibilities[rPlaced][i].size === 0 && puzzle[rPlaced][i] === 0) {
                contradiction = true;
            }
        }
        
        // Column
        if (possibilities[i][cPlaced].has(valPlaced)) {
            possibilities[i][cPlaced].delete(valPlaced);
            if (possibilities[i][cPlaced].size === 0 && puzzle[i][cPlaced] === 0) {
                contradiction = true;
            }
        }
    }
    
    // Eliminate in 3x2 box
    const startRow = Math.floor(rPlaced / 3) * 3;
    const startCol = Math.floor(cPlaced / 2) * 2;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 2; c++) {
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

function findHiddenSingles6x6(puzzle, possibilities, unitType, unitIndex) {
    const updates = [];
    const allNums = range1To6_internal();
    const unitPoss = {};
    
    for (const num of allNums) {
        unitPoss[num] = [];
    }
    
    let coords = [];
    if (unitType === 'row') {
        coords = Array(6).fill(null).map((_, c) => [unitIndex, c]);
    } else if (unitType === 'col') {
        coords = Array(6).fill(null).map((_, r) => [r, unitIndex]);
    } else if (unitType === 'box') {
        // 6 boxes total (0-5), arranged as 2 rows × 3 columns of boxes
        const startRow = Math.floor(unitIndex / 3) * 3;
        const startCol = (unitIndex % 3) * 2;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 2; c++) {
                coords.push([r, c]);
            }
        }
    }
    
    for (const [r, c] of coords) {
        if (puzzle[r][c] === 0) {
            for (const num of possibilities[r][c]) {
                unitPoss[num].push([r, c]);
            }
        }
    }
    
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

function findNakedSingles6x6(puzzle, possibilities) {
    const updates = [];
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (puzzle[r][c] === 0 && possibilities[r][c].size === 1) {
                const val = [...possibilities[r][c]][0];
                updates.push([r, c, val]);
            }
        }
    }
    return updates;
}

// --- Sudoku Logic: Core Solver Loop (Strict Priority) ---

function findAndApplyUpdates6x6(techniqueType, puzzle, possibilities, emptyCellsCount) {
    let updates = [];
    
    if (techniqueType === 'BoxHS') {
        for (let boxIdx = 0; boxIdx < 6; boxIdx++) {
            const boxUpdates = findHiddenSingles6x6(puzzle, possibilities, 'box', boxIdx);
            updates = updates.concat(boxUpdates);
        }
    } else if (techniqueType === 'LineHS') {
        for (let idx = 0; idx < 6; idx++) {
            const rowUpdates = findHiddenSingles6x6(puzzle, possibilities, 'row', idx);
            const colUpdates = findHiddenSingles6x6(puzzle, possibilities, 'col', idx);
            updates = updates.concat(rowUpdates, colUpdates);
        }
    } else if (techniqueType === 'NakedSingle') {
        updates = findNakedSingles6x6(puzzle, possibilities);
    }
    
    if (updates.length === 0) {
        return [emptyCellsCount, false];
    }
    
    // Make updates unique
    const uniqueUpdates = [];
    const seen = new Set();
    for (const [r, c, val] of updates) {
        const key = `${r},${c},${val}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueUpdates.push([r, c, val]);
        }
    }
    
    let contradiction = false;
    for (const [r, c, val] of uniqueUpdates) {
        if (puzzle[r][c] === 0) {
            puzzle[r][c] = val;
            emptyCellsCount--;
            
            if (eliminatePossibilities6x6(possibilities, r, c, val, puzzle)) {
                contradiction = true;
            }
            
            possibilities[r][c] = new Set();
        }
    }
    
    return [emptyCellsCount, contradiction];
}

function solveWithSingles6x6(sudoku, returnDifficulty = false) {
    const puzzle = deepCopyBoard6x6(sudoku);
    const initialEmptyCells = puzzle.flat().filter(x => x === 0).length;
    let highestTechnique = 0;
    
    if (initialEmptyCells === 0) {
        return returnDifficulty ? 0.0 : puzzle;
    }
    
    // Initialize possibilities
    const possibilities = Array(6).fill(null).map(() => 
        Array(6).fill(null).map(() => new Set())
    );
    
    let emptyCellsCount = 0;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (puzzle[r][c] === 0) {
                possibilities[r][c] = new Set(getPossibleValues6x6(puzzle, r, c));
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
    let contradiction = false;
    
    while (emptyCellsCount > 0) {
        // 1. Box Hidden Single
        [emptyCellsCount, contradiction] = findAndApplyUpdates6x6('BoxHS', puzzle, possibilities, emptyCellsCount);
        const boxUpdates = emptyCellsCount < initialEmptyCells - steps;
        if (boxUpdates) {
            steps++;
            if (contradiction) break;
            continue;
        }
        
        highestTechnique = Math.max(1, highestTechnique);
        
        // 2. Line Hidden Single
        const prevCount = emptyCellsCount;
        [emptyCellsCount, contradiction] = findAndApplyUpdates6x6('LineHS', puzzle, possibilities, emptyCellsCount);
        if (emptyCellsCount < prevCount) {
            steps++;
            if (contradiction) break;
            continue;
        }
        
        highestTechnique = 2;
        
        // 3. Naked Single
        const prevCount2 = emptyCellsCount;
        [emptyCellsCount, contradiction] = findAndApplyUpdates6x6('NakedSingle', puzzle, possibilities, emptyCellsCount);
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

function generateSudoku6x6(minDifficulty, maxDifficulty, targetClues = 15, maxAttempts = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const solution = generateSolutionRandom6x6();
        const puzzle = deepCopyBoard6x6(solution);
        
        const positions = [];
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                positions.push([r, c]);
            }
        }
        shuffle6x6(positions);
        
        let cluesRemaining = 36;
        
        for (const [r, c] of positions) {
            if (cluesRemaining <= targetClues) break;
            
            const originalValue = puzzle[r][c];
            puzzle[r][c] = 0;
            
            const difficulty = solveWithSingles6x6(puzzle, true);
            
            if (difficulty < 0) {
                puzzle[r][c] = originalValue;
            } else {
                cluesRemaining--;
                
                if (cluesRemaining <= targetClues && 
                    difficulty >= minDifficulty && 
                    difficulty <= maxDifficulty) {
                    return puzzle;
                }
            }
        }
        
        const finalDifficulty = solveWithSingles6x6(puzzle, true);
        if (finalDifficulty >= minDifficulty && 
            finalDifficulty <= maxDifficulty && 
            cluesRemaining <= targetClues + 3) {
            return puzzle;
        }
    }
    
    // Fallback
    const solution = generateSolutionRandom6x6();
    const puzzle = deepCopyBoard6x6(solution);
    const positions = [];
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            positions.push([r, c]);
        }
    }
    shuffle6x6(positions);
    
    let cluesRemaining = 36;
    for (const [r, c] of positions) {
        if (cluesRemaining <= targetClues) break;
        
        const originalValue = puzzle[r][c];
        puzzle[r][c] = 0;
        
        const difficulty = solveWithSingles6x6(puzzle, true);
        if (difficulty < 0) {
            puzzle[r][c] = originalValue;
        } else {
            cluesRemaining--;
        }
    }
    
    return puzzle;
}

function generateDailySudoku6x6(date) {
    const dateString = date.toISOString().split('T')[0];
    const seed = hashCode6x6(dateString);
    
    const originalRandom = Math.random;
    Math.random = seededRandom6x6(seed);
    
    const puzzle = generateSudoku6x6(0.3, 0.7, 18);
    
    Math.random = originalRandom;
    
    return puzzle;
}

function seededRandom6x6(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

function hashCode6x6(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// --- Hint System ---

function getSortedHiddenSingleUpdate6x6(puzzle, possibilities, unitType) {
    for (const num of range1To6_internal()) {
        for (let unitIndex = 0; unitIndex < 6; unitIndex++) {
            let coords = [];
            if (unitType === 'row') {
                coords = Array(6).fill(null).map((_, c) => [unitIndex, c]);
            } else if (unitType === 'col') {
                coords = Array(6).fill(null).map((_, r) => [r, unitIndex]);
            } else if (unitType === 'box') {
                const startRow = Math.floor(unitIndex / 3) * 3;
                const startCol = (unitIndex % 3) * 2;
                for (let r = startRow; r < startRow + 3; r++) {
                    for (let c = startCol; c < startCol + 2; c++) {
                        coords.push([r, c]);
                    }
                }
            }
            
            const locations = [];
            for (const [r, c] of coords) {
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

function hint6x6(sudoku, priority = 0) {
    const puzzle = deepCopyBoard6x6(sudoku);
    
    const possibilities = Array(6).fill(null).map(() => 
        Array(6).fill(null).map(() => new Set())
    );
    const emptyCells = [];
    
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (puzzle[r][c] === 0) {
                possibilities[r][c] = new Set(getPossibleValues6x6(puzzle, r, c));
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
    
    let techniqueOrder;
    
    if (priority === 1) {
        techniqueOrder = [
            ["Naked Single", null],
            ["Box HS", 'box'],
            ["Line HS", 'row_col']
        ];
    } else {
        techniqueOrder = [
            ["Box HS", 'box'],
            ["Line HS", 'row_col'],
            ["Naked Single", null]
        ];
    }
    
    for (const [techniqueName, unitType] of techniqueOrder) {
        let update = null;
        
        if (techniqueName === "Naked Single") {
            const updates = findNakedSingles6x6(puzzle, possibilities);
            if (updates.length > 0) {
                const [r, c, val] = updates[0];
                return ["Naked Single", [r, c], val];
            }
        } else if (unitType === 'box') {
            update = getSortedHiddenSingleUpdate6x6(puzzle, possibilities, 'box');
            if (update) {
                const [r, c, val] = update;
                return ["Box HS", [r, c], val];
            }
        } else if (unitType === 'row_col') {
            update = getSortedHiddenSingleUpdate6x6(puzzle, possibilities, 'row');
            if (update) {
                const [r, c, val] = update;
                return ["Line HS", [r, c], val];
            }
            
            update = getSortedHiddenSingleUpdate6x6(puzzle, possibilities, 'col');
            if (update) {
                const [r, c, val] = update;
                return ["Line HS", [r, c], val];
            }
        }
    }
    
    if (priority === 0) {
        let bestCell = null;
        let minPossibilities = 7;
        
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
    
    return ["Stuck", [-1, -1], 0];
}

// --- Export Functions ---
if (typeof window !== 'undefined') {
    window.Sudoku6x6 = {
        convertToMatrix: convertToMatrix6x6,
        convertToString: convertToString6x6,
        range1To6: range1To6_internal,
        shuffle: shuffle6x6,
        getBoxIndex: getBoxIndex6x6,
        deepCopyBoard: deepCopyBoard6x6,
        generateSolutionRandom: generateSolutionRandom6x6,
        getPossibleValues: getPossibleValues6x6,
        solveWithSingles: solveWithSingles6x6,
        generateSudoku: generateSudoku6x6,
        generateDailySudoku: generateDailySudoku6x6,
        hint: hint6x6
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertToMatrix: convertToMatrix6x6,
        convertToString: convertToString6x6,
        range1To6: range1To6_internal,
        shuffle: shuffle6x6,
        getBoxIndex: getBoxIndex6x6,
        deepCopyBoard: deepCopyBoard6x6,
        generateSolutionRandom: generateSolutionRandom6x6,
        getPossibleValues: getPossibleValues6x6,
        solveWithSingles: solveWithSingles6x6,
        generateSudoku: generateSudoku6x6,
        generateDailySudoku: generateDailySudoku6x6,
        hint: hint6x6
    };
}
