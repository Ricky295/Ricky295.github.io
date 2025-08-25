/**
 * PhiPulse RNG - A chaotic pseudorandom number generator
 * Based on combinations of sine, cosine, tangent, and logarithm functions
 * Provides high-quality randomness for simulations and games
 * 
 * Note: Not suitable for cryptographic purposes
 */
class PhiPulseRNG {
    constructor(seed) {
        this.seed = seed;
        this.phi = 1.61803398875;
    }
    
    random() {
        const x = this.seed;
        let val;
        
        try {
            val = (
                Math.sin(1e5 * Math.cos(x * 1e4)) +
                Math.cos(1e4 * Math.tanh(x)) +
                Math.sin(Math.log(Math.abs(Math.sin(x) + 1e-6)) * 2e3) +
                (Math.sin(x * this.phi) * 1e5 % 1)
            ) % 1;
            
            // Ensure positive result
            if (val < 0) val += 1;
        } catch (error) {
            // Fallback value on math domain errors
            val = 0.5;
        }
        
        this.seed += 1e-5;
        return val;
    }
    
    // Generate random integer between min and max (inclusive)
    randint(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    // Shuffle array in place using Fisher-Yates algorithm
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

class Sudoku {
    constructor() {
        this.grid = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.rng = null; // Will be set when seeded
    }

    generateSolution() {
        /**
         * Generates a fully solved Sudoku grid.
         */
        const isSafe = (grid, num, row, col) => {
            // Check row
            if (grid[row].includes(num)) {
                return false;
            }
            
            // Check column
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] === num) {
                    return false;
                }
            }
            
            // Check 3x3 subgrid
            const startRow = 3 * Math.floor(row / 3);
            const startCol = 3 * Math.floor(col / 3);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (grid[startRow + r][startCol + c] === num) {
                        return false;
                    }
                }
            }
            
            return true;
        };

        const solveGrid = (grid) => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                        if (this.rng) {
                            this.rng.shuffle(numbers);
                        } else {
                            this.shuffleArray(numbers);
                        }
                        for (const num of numbers) {
                            if (isSafe(grid, num, row, col)) {
                                grid[row][col] = num;
                                if (solveGrid(grid)) {
                                    return true;
                                }
                                grid[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        };

        solveGrid(this.solution);
        this.grid = this.deepCopy(this.solution);
    }

    removeCandidates(level = 0.5) {
        if (level > 3) {
            const proceed = confirm(`Warning! The puzzle may take a bit to generate. Are you sure to proceed?`);
            if (proceed) {
                this.removeCandidatesNoWarn(level);
            } else {
                console.log("Puzzle generation aborted.");
            }
        } else {
            this.removeCandidatesNoWarn(level);
        }
    }

    removeCandidatesNoWarn(level = 0.5) {
        /**
         * Remove numbers from the grid to create the puzzle based on difficulty level.
         */
        if (level < 0 || level > 4) {
            throw new Error("Level must be between 0 and 4.");
        }

        let numClues;
        if (level <= 4 && level >= 0) {
            numClues = Math.max((50 - (level * 8)), 41 - (level * 4));
        }

        this.generateSolution();
        
        let cellsToRemove = 81 - numClues;
        let currentClues = 81;
        let attempts = 0;

        while (cellsToRemove > 0) {
            let row, col;
            if (this.rng) {
                row = this.rng.randint(0, 8);
                col = this.rng.randint(0, 8);
            } else {
                row = Math.floor(Math.random() * 9);
                col = Math.floor(Math.random() * 9);
            }
            attempts++;

            while (this.grid[row][col] === 0) {
                attempts++;
                if (this.rng) {
                    row = this.rng.randint(0, 8);
                    col = this.rng.randint(0, 8);
                } else {
                    row = Math.floor(Math.random() * 9);
                    col = Math.floor(Math.random() * 9);
                }
            }
            
            const backup = this.grid[row][col];
            this.grid[row][col] = 0;
            
            if (!this.hasUniqueSolution(this.deepCopy(this.grid))) {
                this.grid[row][col] = backup;  // Restore if not unique
            } else {
                cellsToRemove--;  // Successfully removed a digit
                currentClues--;
            }
        }
        console.log(`Sudoku generated with ${attempts} attempts.`);
    }

    hasUniqueSolution(grid) {
        /**
         * Check if the Sudoku puzzle has exactly one solution.
         */
        const isSafe = (grid, num, row, col) => {
            if (grid[row].includes(num)) {
                return false;
            }
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] === num) {
                    return false;
                }
            }
            const startRow = 3 * Math.floor(row / 3);
            const startCol = 3 * Math.floor(col / 3);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (grid[startRow + r][startCol + c] === num) {
                        return false;
                    }
                }
            }
            return true;
        };

        let solutionCount = 0;
        
        const countSolutions = () => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isSafe(grid, num, row, col)) {
                                grid[row][col] = num;
                                countSolutions();
                                grid[row][col] = 0;
                            }
                        }
                        return;
                    }
                }
            }
            solutionCount++;
        };
        
        countSolutions();
        return solutionCount === 1;
    }

    convertToMatrix(string) {
        /**
         * Convert a Sudoku puzzle string to a matrix.
         */
        const matrix = [];
        for (let i = 0; i < 81; i += 9) {
            const row = [];
            for (let j = 0; j < 9; j++) {
                const char = string[i + j];
                row.push(char === '.' ? 0 : parseInt(char));
            }
            matrix.push(row);
        }
        return matrix;
    }

    convertToString(matrix) {
        /**
         * Convert a Sudoku puzzle matrix to a string.
         */
        return matrix.flat().map(num => num === 0 ? '.' : num.toString()).join('');
    }

    solveMatrix(matrix, solveForm = null) {
        /**
         * Solve a Sudoku puzzle given as a matrix or a string format.
         */
        if (solveForm === 'string') {
            matrix = this.convertToMatrix(matrix);
        }
        
        const isSafe = (grid, num, row, col) => {
            if (grid[row].includes(num)) {
                return false;
            }
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] === num) {
                    return false;
                }
            }
            const startRow = 3 * Math.floor(row / 3);
            const startCol = 3 * Math.floor(col / 3);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (grid[startRow + r][startCol + c] === num) {
                        return false;
                    }
                }
            }
            return true;
        };
        
        const solve = (grid) => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isSafe(grid, num, row, col)) {
                                grid[row][col] = num;
                                if (solve(grid)) {
                                    return true;
                                }
                                grid[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        };

        this.grid = matrix;
        if (solve(this.grid)) {
            return this.grid;
        } else {
            return null;
        }
    }

    solveString(string, solveForm = null) {
        /**
         * Solve a Sudoku puzzle given as a string or a matrix format.
         */
        const matrix = this.convertToMatrix(string);
        const solvedMatrix = this.solveMatrix(matrix, 'matrix');
        
        if (solvedMatrix) {
            return this.convertToString(solvedMatrix);
        } else {
            return null;
        }
    }

    generateDailySudoku(difficulty = 2, day = new Date(), form = "Matrix") {
        /**
         * Generate a daily sudoku.
         */
        const startDate = new Date(1999, 11, 31); // Month is 0-indexed
        const seed = Math.floor((day - startDate) / (1000 * 60 * 60 * 24));
        
        const levels = [];
        for (let i = 0; i < 6; i++) {
            const tempRng = new PhiPulseRNG(seed * 6 + i);
            levels.push(tempRng.randint(0, 12) / 4);
        }
        levels.sort((a, b) => a - b);
        
        const level = levels[difficulty];
        return this.generateFromSeed(level, seed, form);
    }

    generateFromSeed(difficulty, seed, form = "Matrix") {
        /**
         * Generate a sudoku puzzle from a seed.
         */
        this.rng = new PhiPulseRNG(seed);
        if (form.toLowerCase() === "matrix") {
            return this.matrix(difficulty);
        } else {
            return this.string(difficulty);
        }
    }

    matrix(level = 0.5) {
        /**
         * Generate a Sudoku puzzle with the desired difficulty as a matrix.
         */
        this.removeCandidates(level);
        return this.grid;
    }

    string(level = 0.5) {
        /**
         * Generate a Sudoku puzzle with the desired difficulty as a string.
         */
        this.removeCandidates(level);
        return this.convertToString(this.grid);
    }

    hint(puzzle, priority = 0) {
        /**
         * Find a hint in the puzzle using a specific sequence of techniques.
         * 
         * @param {Array|string} puzzle - A Sudoku puzzle in either string or matrix format
         * @param {number} priority - Which technique sequence to use (0 or 1)
         *                           0: hidden single box → hidden single line → naked single → guesswork
         *                           1: naked single → hidden single box → hidden single line → guesswork
         * 
         * @returns {Array|null} An array with the format [technique_name, [row, col], value] or null if no hint found
         */
        // Convert puzzle to matrix format if it's a string
        let grid;
        if (typeof puzzle === 'string') {
            grid = this.convertToMatrix(puzzle);
        } else {
            grid = this.deepCopy(puzzle);
        }
        
        // Helper function to get candidates for a cell
        const getCandidates = (grid, row, col) => {
            if (grid[row][col] !== 0) {
                return [];
            }
            
            const candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            
            // Remove candidates from row
            for (let c = 0; c < 9; c++) {
                if (grid[row][c] !== 0) {
                    candidates.delete(grid[row][c]);
                }
            }
            
            // Remove candidates from column
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] !== 0) {
                    candidates.delete(grid[r][col]);
                }
            }
            
            // Remove candidates from 3x3 box
            const boxRow = 3 * Math.floor(row / 3);
            const boxCol = 3 * Math.floor(col / 3);
            for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                    if (grid[r][c] !== 0) {
                        candidates.delete(grid[r][c]);
                    }
                }
            }
            
            return Array.from(candidates);
        };
        
        // Create a candidates grid
        const candidatesGrid = [];
        for (let r = 0; r < 9; r++) {
            candidatesGrid[r] = [];
            for (let c = 0; c < 9; c++) {
                candidatesGrid[r][c] = grid[r][c] === 0 ? getCandidates(grid, r, c) : [];
            }
        }
        
        // Define the technique sequences
        const techniqueSequences = [
            // Priority 0: hidden single box → hidden single line → naked single → guesswork
            ["HIDDEN SINGLE(BOX)", "HIDDEN SINGLE(LINE)", "NAKED SINGLE", "GUESS"],
            // Priority 1: naked single → hidden single box → hidden single line → guesswork
            ["NAKED SINGLE", "HIDDEN SINGLE(BOX)", "HIDDEN SINGLE(LINE)", "GUESS"]
        ];
        
        // Use the appropriate technique sequence
        const sequenceIndex = priority === 0 ? 0 : 1;
        const techniqueSequence = techniqueSequences[sequenceIndex];
        
        // Try each technique in sequence
        for (const technique of techniqueSequence) {
            if (technique === "HIDDEN SINGLE(BOX)") {
                // Check for hidden singles in 3x3 boxes
                for (let boxRow = 0; boxRow < 9; boxRow += 3) {
                    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
                        const valuePositions = {};
                        for (let num = 1; num <= 9; num++) {
                            valuePositions[num] = [];
                        }
                        
                        for (let r = boxRow; r < boxRow + 3; r++) {
                            for (let c = boxCol; c < boxCol + 3; c++) {
                                for (const num of candidatesGrid[r][c]) {
                                    valuePositions[num].push([r, c]);
                                }
                            }
                        }
                        
                        for (let num = 1; num <= 9; num++) {
                            const positions = valuePositions[num];
                            if (positions.length === 1 && grid[positions[0][0]][positions[0][1]] === 0) {
                                return ["HIDDEN SINGLE (BOX)", positions[0], num];
                            }
                        }
                    }
                }
            }
            
            else if (technique === "HIDDEN SINGLE(LINE)") {
                // Check for hidden singles in rows
                for (let row = 0; row < 9; row++) {
                    const valuePositions = {};
                    for (let num = 1; num <= 9; num++) {
                        valuePositions[num] = [];
                    }
                    
                    for (let col = 0; col < 9; col++) {
                        for (const num of candidatesGrid[row][col]) {
                            valuePositions[num].push(col);
                        }
                    }
                    
                    for (let num = 1; num <= 9; num++) {
                        const positions = valuePositions[num];
                        if (positions.length === 1 && grid[row][positions[0]] === 0) {
                            return ["HIDDEN SINGLE (LINE)", [row, positions[0]], num];
                        }
                    }
                }
                
                // Check for hidden singles in columns
                for (let col = 0; col < 9; col++) {
                    const valuePositions = {};
                    for (let num = 1; num <= 9; num++) {
                        valuePositions[num] = [];
                    }
                    
                    for (let row = 0; row < 9; row++) {
                        for (const num of candidatesGrid[row][col]) {
                            valuePositions[num].push(row);
                        }
                    }
                    
                    for (let num = 1; num <= 9; num++) {
                        const positions = valuePositions[num];
                        if (positions.length === 1 && grid[positions[0]][col] === 0) {
                            return ["HIDDEN SINGLE (LINE)", [positions[0], col], num];
                        }
                    }
                }
            }
            
            else if (technique === "NAKED SINGLE") {
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (candidatesGrid[row][col].length === 1) {
                            return ["NAKED SINGLE", [row, col], candidatesGrid[row][col][0]];
                        }
                    }
                }
            }
            
            else if (technique === "GUESS") {
                // Find the cell with the fewest candidates and make a guess
                let minCandidates = 10;
                let bestCell = null;
                let bestValue = null;
                
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (grid[row][col] === 0) {
                            const numCandidates = candidatesGrid[row][col].length;
                            if (numCandidates > 0 && numCandidates < minCandidates) {
                                minCandidates = numCandidates;
                                bestCell = [row, col];
                                bestValue = this.solveMatrix(this.deepCopy(grid))[bestCell[0]][bestCell[1]];
                            }
                        }
                    }
                }
                
                if (bestCell) {
                    return ["GUESS", bestCell, bestValue];
                }
            }
        }
        
        return null;  // No hint found
    }

    generateSimple(difficulty = 0.5, format = "matrix") {
        /**
         * Generate a Sudoku puzzle that can be solved using only naked and hidden singles.
         * 
         * @param {number} difficulty - Difficulty level (0-4)
         * @param {string} format - Output format ("matrix" or "string")
         * 
         * @returns {Array|string} A Sudoku puzzle in the specified format
         */
        const maxAttempts = 100;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Generate a puzzle with the desired difficulty
            this.removeCandidatesNoWarn(difficulty);
            
            // Check if it's solvable using only singles
            if (this.isSimple(this.grid)) {
                if (format.toLowerCase() === "string") {
                    return this.convertToString(this.grid);
                } else {
                    return this.deepCopy(this.grid);
                }
            }
        }
        
        // If we couldn't generate a simple puzzle after max_attempts, return the last puzzle
        console.log(`Warning: Could not generate a simple puzzle after ${maxAttempts} attempts.`);
        if (format.toLowerCase() === "string") {
            return this.convertToString(this.grid);
        } else {
            return this.deepCopy(this.grid);
        }
    }

    isSimple(puzzle) {
        /**
         * Check if the puzzle can be solved using only naked and hidden singles.
         * 
         * @param {Array|string} puzzle - A Sudoku puzzle in either string or matrix format
         * 
         * @returns {boolean} True if the puzzle can be solved using only singles, False otherwise
         */
        // Convert puzzle to matrix format if it's a string
        let grid;
        if (typeof puzzle === 'string') {
            grid = this.convertToMatrix(puzzle);
        } else {
            grid = this.deepCopy(puzzle);
        }
        
        // Make a copy to work on
        const workingGrid = this.deepCopy(grid);
        
        // Track if we made progress
        let madeProgress = true;
        
        while (madeProgress) {
            madeProgress = false;
            
            // Try each technique sequence, but not guessing
            for (let priority = 0; priority < 2; priority++) {
                const hintResult = this.hint(workingGrid, priority);
                if (hintResult && hintResult[0] !== "GUESS") {
                    const [technique, [row, col], value] = hintResult;
                    workingGrid[row][col] = value;
                    madeProgress = true;
                    break;  // Start over with all techniques after placing a value
                }
            }
        }
        
        // Check if the puzzle is solved
        for (const row of workingGrid) {
            if (row.includes(0)) {
                return false;  // Not all cells filled
            }
        }
        
        return true;
    }

    solvePath(puzzle, priority = 0) {
        /**
         * Generate a step-by-step solution path for a Sudoku puzzle using only the hint() function.
         *
         * @param {Array|string} puzzle - A Sudoku puzzle in either string or matrix format
         * @param {number} priority - Which technique sequence to use (0 or 1)
         *                           0: hidden single box → hidden single line → naked single → guesswork
         *                           1: naked single → hidden single box → hidden single line → guesswork
         *
         * @returns {Array|null} A list of solution steps, where each step is [technique_name, [row, col], value]
         *                       or null if the puzzle is unsolvable
         */
        // Convert puzzle to matrix format if it's a string
        let grid;
        if (typeof puzzle === 'string') {
            grid = this.convertToMatrix(puzzle);
        } else {
            grid = this.deepCopy(puzzle);
        }

        // Make a working copy
        const workingGrid = this.deepCopy(grid);

        // Store the solution path
        const solutionPath = [];

        // Keep applying hints until solved or no more hints
        while (true) {
            // Check if the puzzle is solved
            let isSolved = true;
            for (const row of workingGrid) {
                if (row.includes(0)) {
                    isSolved = false;
                    break;
                }
            }

            if (isSolved) {
                return solutionPath;
            }

            // Get a hint
            const hintResult = this.hint(workingGrid, priority);

            // If no hint is found, the puzzle is unsolvable with these techniques
            if (!hintResult) {
                return null;
            }

            // Apply the hint
            const [technique, [row, col], value] = hintResult;
            workingGrid[row][col] = value;

            // Add the step to the solution path
            solutionPath.push(hintResult);
        }
    }

    // Utility methods
    deepCopy(arr) {
        return arr.map(row => [...row]);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    

    // PhiPulse RNG - Advanced chaotic pseudorandom number generator
    seedRandom(seed) {
        const phi = 1.61803398875;
        this._rngSeed = seed;
        
        // Replace Math.random with PhiPulse RNG
        const originalRandom = Math.random;
        Math.random = () => {
            const x = this._rngSeed;
            let val;
            
            try {
                val = (
                    Math.sin(1e5 * Math.cos(x * 1e4)) +
                    Math.cos(1e4 * Math.tanh(x)) +
                    Math.sin(Math.log(Math.abs(Math.sin(x) + 1e-6)) * 2e3) +
                    (Math.sin(x * phi) * 1e5 % 1)
                ) % 1;
                
                // Ensure positive result
                if (val < 0) val += 1;
            } catch (error) {
                // Fallback value on math domain errors
                val = 0.5;
            }
            
            this._rngSeed += 1e-5;
            return val;
        };
        
        // Store reference to restore later if needed
        this._originalRandom = originalRandom;
    }
}

// Example usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sudoku;
} else if (typeof window !== 'undefined') {
    window.Sudoku = Sudoku;
}

// Example usage (for Node.js or browser console)
/*
const sudoku = new Sudoku();

// Generate a daily Sudoku and get a hint
const simplePuzzle = sudoku.generateDailySudoku(5, new Date(), "matrix");
console.log("Today's daily:");
simplePuzzle.forEach(row => console.log(row));

// Try each priority
for (let priority = 0; priority < 2; priority++) {
    const solvePath = sudoku.solvePath(simplePuzzle, priority);
    console.log(`Solve path with priority ${priority}:`);
    solvePath.forEach(step => console.log(step));
}
*/
