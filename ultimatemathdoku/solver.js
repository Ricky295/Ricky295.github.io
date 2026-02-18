/**
 * MathdokuSolver Logic Engine
 * Shared by Constructor (Rating), Player (Verification), and Solver (Heatmaps).
 */
class MathdokuSolver {
    constructor(size, cages, givens = {}) {
        this.size = size;
        this.cages = cages;
        this.givens = givens;
        this.solutions = [];
        this.backtrackCount = 0;
    }

    solve(limit = 1000) {
        const grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
        
        // Load Givens
        for (const key in this.givens) {
            const [r, c] = key.split(',').map(Number);
            grid[r][c] = this.givens[key];
        }

        this._backtrack(grid, 0, 0, limit);
        return {
            solutions: this.solutions,
            count: this.solutions.length,
            complexity: this.backtrackCount
        };
    }

    _backtrack(grid, r, c, limit) {
        if (this.solutions.length >= limit) return;
        
        if (c === this.size) { r++; c = 0; }
        if (r === this.size) {
            if (this._verifyAllCages(grid)) {
                this.solutions.push(grid.map(row => [...row]));
            }
            return;
        }

        if (grid[r][c] !== 0) {
            this._backtrack(grid, r, c + 1, limit);
            return;
        }

        this.backtrackCount++;
        for (let n = 1; n <= this.size; n++) {
            if (this._isSafe(grid, r, c, n)) {
                grid[r][c] = n;
                if (this._isPartialCageValid(grid, r, c)) {
                    this._backtrack(grid, r, c + 1, limit);
                }
                grid[r][c] = 0;
            }
        }
    }

    _isSafe(grid, r, c, n) {
        for (let i = 0; i < this.size; i++) {
            if (grid[r][i] === n || grid[i][c] === n) return false;
        }
        return true;
    }

    _isPartialCageValid(grid, r, c) {
        const cage = this.cages.find(cg => cg.cells.some(p => p[0] === r && p[1] === c));
        if (!cage) return true;

        const vals = cage.cells.map(([rr, cc]) => grid[rr][cc]).filter(v => v !== 0);
        const isFull = vals.length === cage.cells.length;
        const { target: t, op } = cage;

        if (op === '+') {
            const s = vals.reduce((a, b) => a + b, 0);
            return isFull ? s === t : s < t;
        }
        if (op === '*') {
            const p = vals.reduce((a, b) => a * b, 1);
            return isFull ? p === t : p <= t;
        }
        if (op === '-') {
            if (!isFull) return true;
            return Math.abs(vals[0] - vals[1]) === t;
        }
        if (op === '/') {
            if (!isFull) return true;
            return (vals[0] / vals[1] === t || vals[1] / vals[0] === t);
        }
        if (op === 'None') return vals[0] === t;
        return true;
    }

    _verifyAllCages(grid) {
        return this.cages.every(cg => {
            const vals = cg.cells.map(([r, c]) => grid[r][c]);
            const { target: t, op } = cg;
            if (op === '+') return vals.reduce((a, b) => a + b, 0) === t;
            if (op === '*') return vals.reduce((a, b) => a * b, 1) === t;
            if (op === '-') return Math.abs(vals[0] - vals[1]) === t;
            if (op === '/') return vals[0] / vals[1] === t || vals[1] / vals[0] === t;
            if (op === 'None') return vals[0] === t;
            return false;
        });
    }
}
