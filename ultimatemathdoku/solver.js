/**
 * SOLVER & RATER MODULE
 */

function solveMathdoku(size, cages, givens, maxSolutions = 1000) {
    const solutions = [];
    const state = { backtrackCount: 0 };
    const grid = Array.from({ length: size }, () => Array(size).fill(0));

    // PERFORMANCE BOOST: Map every [r,c] to its cage once so we don't use .find() in every loop
    const cageMap = {};
    cages.forEach(cage => {
        cage.cells.forEach(([r, c]) => {
            cageMap[`${r},${c}`] = cage;
        });
    });

    // Fill givens
    for (const key in givens) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = givens[key];
    }

    function backtrack(r, c) {
        if (solutions.length >= maxSolutions) return;
        
        if (c === size) { r++; c = 0; }
        if (r === size) {
            // Final verification of all cages
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
                // Only proceed if this placement doesn't break the current cage
                if (isPartialCageValid(grid, r, c, cageMap)) {
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
 * Validates a cage as it is being filled.
 */
function isPartialCageValid(grid, r, c, cageMap) {
    const cage = cageMap[`${r},${c}`];
    if (!cage) return true;

    const vals = cage.cells.map(([cr, cc]) => grid[cr][cc]).filter(v => v !== 0);
    const isFull = vals.length === cage.cells.length;

    switch (cage.op) {
        case '+': {
            const sum = vals.reduce((a, b) => a + b, 0);
            return isFull ? sum === cage.target : sum < cage.target;
        }
        case '*': {
            const prod = vals.reduce((a, b) => a * b, 1);
            return isFull ? prod === cage.target : prod <= cage.target;
        }
        case '-': {
            if (!isFull) return true;
            const [largest, ...others] = [...vals].sort((a, b) => b - a);
            const othersSum = others.reduce((a, b) => a + b, 0);
            return (largest - othersSum) === cage.target;
        }
        case '/': {
            if (!isFull) return true;
            const [largest, ...others] = [...vals].sort((a, b) => b - a);
            const othersProduct = others.reduce((a, b) => a * b, 1);
            return (largest / othersProduct) === cage.target;
        }
        case 'None': 
            return vals[0] === cage.target;
    }
    return true;
}

/**
 * Final validation for the entire grid.
 */
function checkAllCages(grid, cages) {
    return cages.every(cage => {
        const vals = cage.cells.map(([r, c]) => grid[r][c]);
        if (vals.includes(0)) return false;

        const sorted = [...vals].sort((a, b) => b - a);
        const largest = sorted[0];

        switch (cage.op) {
            case '+': return vals.reduce((a, b) => a + b, 0) === cage.target;
            case '*': return vals.reduce((a, b) => a * b, 1) === cage.target;
            case '-': 
                return (largest - sorted.slice(1).reduce((a, b) => a + b, 0)) === cage.target;
            case '/': 
                return (largest / sorted.slice(1).reduce((a, b) => a * b, 1)) === cage.target;
            case 'None': return vals[0] === cage.target;
            default: return false;
        }
    });
}

function isSafe(grid, r, c, num, size) {
    for (let i = 0; i < size; i++) {
        if (i !== c && grid[r][i] === num) return false;
        if (i !== r && grid[i][c] === num) return false;
    }
    return true;
}

function ratePuzzle(solverResult) {
    const { count, complexity } = solverResult;
    if (count === 0) return { label: "Impossible", color: "red", status: "Invalid" };
    if (count > 1) return { label: "Ambiguous", color: "orange", status: "Multi-Solution" };

    let label = "Beyond Diabolical";
    let color = "slate";

    if (complexity <= 100) { label = "Easy"; color = "emerald"; }
    else if (complexity <= 200) { label = "Medium"; color = "teal"; }
    else if (complexity <= 400) { label = "Hard"; color = "blue"; }
    else if (complexity <= 700) { label = "Vicious"; color = "indigo"; }
    else if (complexity <= 1000) { label = "Devilish"; color = "rose"; }
    else if (complexity <= 1500) { label = "Diabolical"; color = "red"; }

    return { label, color, status: "Unique" };
}
