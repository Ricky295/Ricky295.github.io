/**
 * SOLVER & RATER MODULE - Optimized for 7x7+ and Realistic Difficulty
 */

function solveMathdoku(size, cages, givens, maxSolutions = 1000) {
    const solutions = [];
    const state = { backtrackCount: 0 };
    const grid = Array.from({ length: size }, () => Array(size).fill(0));

    const cageMap = {};
    cages.forEach(cage => {
        cage.cells.forEach(([r, c]) => {
            cageMap[`${r},${c}`] = cage;
        });
    });

    for (const key in givens) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = givens[key];
    }

    function isCageCompleteAndValid(cage, currentGrid) {
        const vals = [];
        for (const [r, c] of cage.cells) {
            const val = currentGrid[r][c];
            if (val === 0) return true; 
            vals.push(val);
        }
        
        const sorted = [...vals].sort((a, b) => b - a);
        const largest = sorted[0];
        
        switch (cage.op) {
            case '+': return vals.reduce((a, b) => a + b, 0) === cage.target;
            case '*': return vals.reduce((a, b) => a * b, 1) === cage.target;
            case '-': return (largest - sorted.slice(1).reduce((a, b) => a + b, 0)) === cage.target;
            case '/': return (largest / sorted.slice(1).reduce((a, b) => a * b, 1)) === cage.target;
            case 'None': return vals[0] === cage.target;
            default: return false;
        }
    }

    function backtrack(r, c) {
        if (solutions.length >= maxSolutions) return;
        if (c === size) { r++; c = 0; }
        if (r === size) {
            solutions.push(grid.map(row => [...row]));
            return;
        }

        if (grid[r][c] !== 0) {
            backtrack(r, c + 1);
            return;
        }

        for (let num = 1; num <= size; num++) {
            if (isSafe(grid, r, c, num, size)) {
                grid[r][c] = num;
                state.backtrackCount++;

                const currentCage = cageMap[`${r},${c}`];
                if (isCageCompleteAndValid(currentCage, grid)) {
                    backtrack(r, c + 1);
                }

                grid[r][c] = 0;
            }
        }
    }

    backtrack(0, 0);
    return { count: solutions.length, solutions, complexity: state.backtrackCount, cages, size };
}

/**
 * NEW: Calculates how many ways a cage's target can be reached.
 * This acts as a proxy for human logical difficulty.
 */
function calculateCagePossibilities(cage, size) {
    if (cage.op === 'None') return 1;
    
    let combinations = 0;
    const cellCount = cage.cells.length;
    const nums = Array.from({length: size}, (_, i) => i + 1);

    // Simple heuristic-based estimation for performance
    // For 2-cell cages, we can be exact
    if (cellCount === 2) {
        for (let i = 1; i <= size; i++) {
            for (let j = 1; j <= size; j++) {
                if (i === j) continue; // Basic Latin Square rule
                let match = false;
                if (cage.op === '+') match = (i + j === cage.target);
                else if (cage.op === '*') match = (i * j === cage.target);
                else if (cage.op === '-') match = (Math.abs(i - j) === cage.target);
                else if (cage.op === '/') match = (i / j === cage.target || j / i === cage.target);
                if (match) combinations++;
            }
        }
        return combinations || 1;
    }

    // For larger cages, we use a weighted estimation of "degree of freedom"
    // Addition/Multiplication with many cells and large targets have many permutations
    if (cage.op === '+') return Math.pow(cellCount, 2); 
    if (cage.op === '*') return cellCount; // Multiplication is usually more restrictive

    return cellCount * 2;
}

function checkAllCages(grid, cages) {
    return cages.every(cage => {
        const vals = cage.cells.map(([r, c]) => grid[r][c]);
        if (vals.includes(0)) return false;
        const sorted = [...vals].sort((a, b) => b - a);
        const largest = sorted[0];
        switch (cage.op) {
            case '+': return vals.reduce((a, b) => a + b, 0) === cage.target;
            case '*': return vals.reduce((a, b) => a * b, 1) === cage.target;
            case '-': return (largest - sorted.slice(1).reduce((a, b) => a + b, 0)) === cage.target;
            case '/': return (largest / sorted.slice(1).reduce((a, b) => a * b, 1)) === cage.target;
            case 'None': return vals[0] === cage.target;
            default: return false;
        }
    });
}

function isSafe(grid, r, c, num, size) {
    for (let i = 0; i < size; i++) {
        if (grid[r][i] === num) return false;
        if (grid[i][c] === num) return false;
    }
    return true;
}

function ratePuzzle(solverResult) {
    const { count, complexity, cages, size } = solverResult;
    if (count === 0) return { label: "Impossible", color: "red", status: "Invalid" };
    if (count > 1) return { label: "Ambiguous", color: "orange", status: "Multi-Solution" };

    // Calculate logical weight based on your idea: 
    // Average possibilities per cell + Log of solver complexity
    let totalPossibilities = 0;
    cages.forEach(c => {
        totalPossibilities += calculateCagePossibilities(c, size);
    });

    const logicalDensity = totalPossibilities / (size * size);
    const computationalLog = Math.log10(complexity || 1);
    
    // Weighted score: 70% Logical Combinations, 30% Search Depth
    const score = (logicalDensity * 150) + (computationalLog * 40);

    if (score <= 100) return { label: "Easy", color: "emerald", score };
    if (score <= 180) return { label: "Medium", color: "teal", score };
    if (score <= 260) return { label: "Hard", color: "blue", score };
    if (score <= 340) return { label: "Vicious", color: "indigo", score };
    if (score <= 420) return { label: "Devilish", color: "rose", score };
    if (score <= 500) return { label: "Diabolical", color: "red", score };
    return { label: "Beyond Diabolical", color: "slate", score };
}
