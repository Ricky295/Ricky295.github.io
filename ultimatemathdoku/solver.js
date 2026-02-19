/**
 * Mathdoku (KenKen) Solver and Rater
 * This file contains the logic to solve Mathdoku puzzles using backtracking 
 * with constraint propagation and evaluate their difficulty.
 * * Note: Export removed to support standard script tag loading.
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
        this.firstSolution = null;
        
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

        // 2. Cage Constraint Check
        const cageIdx = this.cellToCageMap[idx];
        if (cageIdx === undefined) return true;

        const cage = this.cages[cageIdx];
        const cageValues = cage.cells.map(i => i === idx ? val : this.grid[i]).filter(v => v !== 0);
        
        if (cageValues.length === cage.cells.length) {
            return this.checkCageLogic(cage, cageValues);
        }

        return this.checkPartialCageLogic(cage, cageValues);
    }

    checkCageLogic(cage, values) {
        switch(cage.op) {
            case '+': return values.reduce((a, b) => a + b, 0) === cage.target;
            case '*': return values.reduce((a, b) => a * b, 1) === cage.target;
            case '-': {
                const max = Math.max(...values);
                return (max - (values.reduce((a, b) => a + b, 0) - max)) === cage.target;
            }
            case '/': {
                const max = Math.max(...values);
                return (max / (values.reduce((a, b) => a * b, 1) / max)) === cage.target;
            }
            case '=': return values[0] === cage.target;
            default: return false;
        }
    }

    checkPartialCageLogic(cage, values) {
        const remaining = cage.cells.length - values.length;
        const currentSum = values.reduce((a, b) => a + b, 0);
        const currentProd = values.reduce((a, b) => a * b, 1);

        switch(cage.op) {
            case '+':
                if (currentSum + remaining > cage.target) return false;
                if (currentSum + (remaining * this.size) < cage.target) return false;
                break;
            case '*':
                if (currentProd > cage.target && cage.target !== 0) return false;
                break;
        }
        return true;
    }

    /**
     * Finds all valid permutations for a cage ignoring grid constraints.
     */
    countPotentialCombinations(cage) {
        let count = 0;
        const n = this.size;
        const k = cage.cells.length;
        
        const backtrack = (index, currentValues) => {
            if (index === k) {
                if (this.checkCageLogic(cage, currentValues)) count++;
                return;
            }
            for (let v = 1; v <= n; v++) {
                currentValues.push(v);
                backtrack(index + 1, currentValues);
                currentValues.pop();
            }
        };

        backtrack(0, []);
        return count;
    }

    solve(index = 0) {
        if (index === this.size * this.size) {
            this.firstSolution = [...this.grid];
            return true;
        }

        for (let v = 1; v <= this.size; v++) {
            if (this.isValid(index, v)) {
                this.grid[index] = v;
                if (this.solve(index + 1)) return true;
                this.grid[index] = 0;
                this.backtracks++;
            }
        }
        return false;
    }

    /**
     * Difficulty Rating with Expanded Levels
     */
    rateDifficulty() {
        if (!this.firstSolution) return { rank: "Unsolvable", score: Infinity };

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
                avgCageComplexity: avgCageComplexity.toFixed(2),
                totalCages: this.cages.length
            }
        };
    }
}
