/**
 * SOLVER MODULE - Procedural backtracking for Mathdoku
 */

function solveMathdoku(size, cages, givens, maxSolutions = 1000) {
    const solutions = [];
    const state = { backtrackCount: 0 };
    const grid = Array.from({ length: size }, () => Array(size).fill(0));

    // Fill givens
    for (const key in givens) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = givens[key];
    }

    // Internal recursive runner
    function backtrack(r, c) {
        if (solutions.length >= maxSolutions) return;
        
        if (c === size) { r++; c = 0; }
        if (r === size) {
            if (checkAllCages(grid, cages)) {
                solutions.push(grid.map(row => [...row]));
            }
            return;
        }

        if (grid[r][c] !== 0) {
            if (isSafe(grid, r, c, grid[r][c], size)) {
                backtrack(r, c + 1);
            }
            return;
        }

        state.backtrackCount++;
        for (let num = 1; num <= size; num++) {
            if (isSafe(grid, r, c, num, size)) {
                grid[r][c] = num;
                if (isPartialCageValid(grid, r, c, cages)) {
                    backtrack(r, c + 1);
                }
                grid[r][c] = 0;
            }
        }
    }

    backtrack(0, 0);
    return { 
        count: solutions.length, 
        complexity: state.backtrackCount, 
        solutions 
    };
}

function isSafe(grid, r, c, num, size) {
    for (let i = 0; i < size; i++) {
        if (i !== c && grid[r][i] === num) return false;
        if (i !== r && grid[i][c] === num) return false;
    }
    return true;
}

function isPartialCageValid(grid, r, c, cages) {
    const cage = cages.find(cg => cg.cells.some(cell => cell[0] === r && cell[1] === c));
    if (!cage) return true;

    const vals = cage.cells.map(([cr, cc]) => grid[cr][cc]).filter(v => v !== 0);
    const isFull = vals.length === cage.cells.length;

    switch (cage.op) {
        case '+': 
            const sum = vals.reduce((a, b) => a + b, 0);
            return isFull ? sum === cage.target : sum < cage.target;
        case '*': 
            const prod = vals.reduce((a, b) => a * b, 1);
            return isFull ? prod === cage.target : prod <= cage.target;
        case '-': 
            if (!isFull) return true;
            return Math.abs(vals[0] - vals[1]) === cage.target;
        case '/': 
            if (!isFull) return true;
            return Math.abs(vals[0] / vals[1] - cage.target) < 0.001 || Math.abs(vals[1] / vals[0] - cage.target) < 0.001;
        case 'None': 
            return vals[0] === cage.target;
    }
    return true;
}

function checkAllCages(grid, cages) {
    return cages.every(cage => {
        const vals = cage.cells.map(([r, c]) => grid[r][c]);
        if (cage.op === '+') return vals.reduce((a, b) => a + b, 0) === cage.target;
        if (cage.op === '*') return vals.reduce((a, b) => a * b, 1) === cage.target;
        if (cage.op === '-') return Math.abs(vals[0] - vals[1]) === cage.target;
        if (cage.op === '/') return Math.abs(vals[0] / vals[1] - cage.target) < 0.001 || Math.abs(vals[1] / vals[0] - cage.target) < 0.001;
        if (cage.op === 'None') return vals[0] === cage.target;
        return false;
    });
}
