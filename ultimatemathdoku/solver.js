/**
 * Mathdoku (KenKen) Solver and Rater
 * This file contains the logic to solve Mathdoku puzzles using backtracking 
 * with constraint propagation and evaluate their difficulty.
 */

class MathdokuSolver {
    /**
     * @param {number} size - The N x N dimensions of the grid.
     * @param {Array} cages - Array of cage objects: { target: number, op: string, cells: number[] }
     * Cells are indexed 0 to (N*N - 1).
     */
    constructor(size, cages) {
        this.size = size;
        this.cages = cages;
        this.grid = Array(size * size).fill(0);
        this.backtracks = 0;
        this.solutions = []; // Array to store multiple solutions
        
        // Pre-map cells to their respective cage index for O(1) lookup during solving
        this.cellToCageMap = {};
        this.cages.forEach((cage, index) => {
            cage.cells.forEach(cellIdx => {
                this.cellToCageMap[cellIdx] = index;
            });
        });
    }

    /**
     * Validates if placing 'val' at 'idx' breaks any Mathdoku rules.
     */
    isValid(idx, val) {
        const r = Math.floor(idx / this.size);
        const c = idx % this.size;

        // 1. Latin Square Check: Row/Col uniqueness
        for (let i = 0; i < this.size; i++) {
            if (this.grid[r * this.size + i] === val) return false;
            if (this.grid[i * this.size + c] === val) return false;
        }

        // 2. Cage Check
        const cageIdx = this.cellToCageMap[idx];
        const cage = this.cages[cageIdx];
        
        // Temporarily place the value to check cage validity
        this.grid[idx] = val;
        const valid = this.isCageValid(cage);
        this.grid[idx] = 0; // Reset
        
        return valid;
    }

    /**
     * Checks if a cage is mathematically valid based on its current entries.
     */
    isCageValid(cage) {
        const values = cage.cells.map(c => this.grid[c]).filter(v => v !== 0);
        const isComplete = values.length === cage.cells.length;

        // If cage is not full, we check if it's still possible to reach the target
        switch (cage.op) {
            case '+':
                const sum = values.reduce((a, b) => a + b, 0);
                if (sum > cage.target) return false;
                if (isComplete && sum !== cage.target) return false;
                break;
            case '*':
                const product = values.reduce((a, b) => a * b, 1);
                if (product > cage.target) return false;
                if (isComplete && product !== cage.target) return false;
                break;
            case '-':
                if (isComplete) {
                    const [a, b] = values;
                    if (Math.abs(a - b) !== cage.target) return false;
                }
                break;
            case '/':
                if (isComplete) {
                    const [a, b] = values;
                    if (a / b !== cage.target && b / a !== cage.target) return false;
                }
                break;
            case '': // Single cell cage
                if (values[0] !== cage.target) return false;
                break;
        }
        return true;
    }

    /**
     * Finds up to 2 solutions. 
     * Stopping at 2 is enough to determine non-uniqueness without searching the whole tree.
     */
    findAllSolutions(limit = 2) {
        this.solutions = [];
        this.backtracks = 0;
        this.solveRecursive(0, limit);
        return this.solutions;
    }

    solveRecursive(idx, limit) {
        if (this.solutions.length >= limit) return;

        if (idx === this.size * this.size) {
            this.solutions.push([...this.grid]);
            return;
        }

        for (let val = 1; val <= this.size; val++) {
            if (this.isValid(idx, val)) {
                this.grid[idx] = val;
                this.solveRecursive(idx + 1, limit);
                this.grid[idx] = 0;
                
                if (this.solutions.length >= limit) return;
            } else {
                this.backtracks++;
            }
        }
    }

    /**
     * Difficulty Rating with Expanded Levels
     */
    rateDifficulty() {
        // Find solutions if not already done
        if (this.solutions.length === 0) {
            this.findAllSolutions(2);
        }

        // 1. Handle Impossible
        if (this.solutions.length === 0) {
            return { rank: "Impossible", score: Infinity };
        }

        // Calculate complexity score (used for both unique and non-unique)
        let totalCageComplexity = 0;
        this.cages.forEach(c => {
            const combos = this.countPotentialCombinations(c);
            let complexity = Math.log2(combos + 1);
            
            if (c.op === '/' || c.op === '*') complexity *= 1.5;
            if (c.op === '-') complexity *= 1.2;
            
            totalCageComplexity += complexity;
        });

        const avgCageComplexity = totalCageComplexity / this.cages.length;
        const searchScore = Math.sqrt(this.backtracks) * 2;
        const totalScore = Math.round((avgCageComplexity * 20) + searchScore);

        // 2. Handle Non-unique (returning calculated score instead of 0)
        if (this.solutions.length > 1) {
            return { 
                rank: "Non-unique", 
                score: totalScore,
                metrics: {
                    backtracks: this.backtracks,
                    avgComplexity: avgCageComplexity.toFixed(2),
                    solutionCount: this.solutions.length
                }
            };
        }

        // Standard ranking for unique solutions
        let rank = "";
        if (totalScore < 15) rank = "Easy";
        else if (totalScore < 30) rank = "Medium";
        else if (totalScore < 50) rank = "Hard";
        else if (totalScore < 75) rank = "Vicious";
        else if (totalScore < 110) rank = "Devilish";
        else if (totalScore < 160) rank = "Diabolical";
        else rank = "Beyond Diabolical";

        return { 
            score: totalScore, 
            rank, 
            metrics: {
                backtracks: this.backtracks,
                avgComplexity: avgCageComplexity.toFixed(2),
                solutionCount: this.solutions.length
            }
        };
    }

    /**
     * Helper to estimate cage complexity
     */
    countPotentialCombinations(cage) {
        if (cage.cells.length === 1) return 1;
        if (cage.op === '-') return this.size;
        if (cage.op === '/') return 2;
        return Math.pow(this.size, cage.cells.length - 1);
    }
}
