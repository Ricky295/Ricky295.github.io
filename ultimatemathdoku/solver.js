/**
 * SOLVER & RATER MODULE
 * Procedural backtracking and difficulty classification for Mathdoku
 */

/**
 * Core backtracking solver
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

/**
 * Difficulty classification logic
 */
function ratePuzzle(solverResult) {
    const { count, complexity } = solverResult;

    if (count === 0) return { label: "Impossible", color: "red", status: "Invalid" };
    if (count > 1) return { label: "Ambiguous", color: "orange", status: "Multi-Solution" };

    // Unique solution difficulty mapping
    let label = "Beyond Diabolical";
    let color = "slate";

    if (complexity <= 100) { label = "Easy"; color = "emerald"; }
    else if (complexity <= 200) { label = "Medium"; color = "teal"; }
    else if (complexity <= 400) { label = "Hard"; color = "blue"; }
    else if (complexity <= 700) { label = "Vicious"; color = "indigo"; }
    else if (complexity <= 1000) { label = "Devilish"; color = "rose"; }
    else if (complexity <= 1500) { label = "Diabolical"; color = "red"; }

    return {
        label,
        color,
        status: "Unique"
    };
}

/**
 * Helper functions
 */
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

    // For subtraction/division with 3+ cells, we need the full set to be certain,
    // but we can perform "impossible" checks early.
    switch (cage.op) {
        case '-': {
            if (!isFull) return true; 
            const sorted = [...vals].sort((a, b) => b - a);
            const largest = sorted[0];
            const othersSum = sorted.slice(1).reduce((a, b) => a + b, 0);
            return (largest - othersSum) === cage.target;
        }

        case '/': {
            if (!isFull) return true;
            const sorted = [...vals].sort((a, b) => b - a);
            const largest = sorted[0];
            const othersProduct = sorted.slice(1).reduce((a, b) => a * b, 1);
            return (largest / othersProduct) === cage.target;
        }

        case '+': 
            const sum = vals.reduce((a, b) => a + b, 0);
            return isFull ? sum === cage.target : sum < cage.target;

        case '*': 
            const prod = vals.reduce((a, b) => a * b, 1);
            return isFull ? prod === cage.target : prod <= cage.target;

        case 'None': 
            return vals[0] === cage.target;
    }
    return true;
}
