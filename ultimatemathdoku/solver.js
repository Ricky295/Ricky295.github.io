/**
 * OPTIMIZED SOLVER & RATER
 * Implements Early Pruning and Pre-calculated Cage State
 */

function solveMathdoku(size, cages, givens, maxSolutions = 1000) {
    const solutions = [];
    const state = { backtrackCount: 0 };
    const grid = Array.from({ length: size }, () => Array(size).fill(0));

    // Map every cell to its cage for O(1) lookup
    const cageMap = Array.from({ length: size }, () => Array(size).fill(null));
    cages.forEach(cage => {
        cage.cells.forEach(([r, c]) => {
            cageMap[r][c] = cage;
        });
    });

    // Apply givens
    for (const key in givens) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = givens[key];
    }

    /**
     * Optimized validation: Checks if the current value breaks the cage rules.
     * Returns false if the cage is now impossible (Early Pruning).
     */
    function isCageValid(cage, currentR, currentC) {
        let filledCount = 0;
        let sum = 0;
        let product = 1;
        let max = 0;
        let min = Infinity;
        const vals = [];

        for (const [r, c] of cage.cells) {
            const val = grid[r][c];
            if (val !== 0) {
                filledCount++;
                sum += val;
                product *= val;
                if (val > max) max = val;
                if (val < min) min = val;
                vals.push(val);
            }
        }

        const isComplete = filledCount === cage.cells.length;

        switch (cage.op) {
            case '+':
                if (sum > cage.target) return false;
                if (isComplete && sum !== cage.target) return false;
                // Heuristic: if remaining cells can't reach target even with max values
                const remaining = cage.cells.length - filledCount;
                if (!isComplete && (sum + remaining * size < cage.target)) return false;
                return true;

            case '*':
                if (product > cage.target) return false;
                if (isComplete && product !== cage.target) return false;
                return true;

            case '-':
                if (!isComplete) return true; // Hard to prune partial subtraction
                // In Mathdoku, subtraction is usually restricted to 2 cells: [Large] - [Small]
                vals.sort((a, b) => b - a);
                return (vals[0] - vals.slice(1).reduce((a, b) => a + b, 0)) === cage.target;

            case '/':
                if (!isComplete) return true;
                vals.sort((a, b) => b - a);
                return (vals[0] / vals.slice(1).reduce((a, b) => a * b, 1)) === cage.target;

            case 'None':
                return vals[0] === cage.target;

            default:
                return true;
        }
    }

    function isSafe(r, c, num) {
        for (let i = 0; i < size; i++) {
            if (grid[r][i] === num || grid[i][c] === num) return false;
        }
        return true;
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

        const currentCage = cageMap[r][c];

        for (let num = 1; num <= size; num++) {
            if (isSafe(r, c, num)) {
                grid[r][c] = num;
                state.backtrackCount++;

                // Early Pruning: Only recurse if the current cage is still mathematically possible
                if (isCageValid(currentCage, r, c)) {
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
 * Difficulty Rater
 */
function calculateCagePossibilities(cage, size) {
    if (cage.op === 'None') return 1;
    const cellCount = cage.cells.length;
    if (cellCount === 2) {
        let combinations = 0;
        for (let i = 1; i <= size; i++) {
            for (let j = 1; j <= size; j++) {
                if (i === j) continue;
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
    if (cage.op === '+') return Math.pow(cellCount, 2);
    if (cage.op === '*') return cellCount;
    return cellCount * 2;
}

function ratePuzzle(solverResult) {
    const { count, complexity, cages, size } = solverResult;
    if (count === 0) return { label: "Impossible", color: "red", status: "Invalid" };
    if (count > 1) return { label: "Ambiguous", color: "orange", status: "Multi-Solution" };

    let totalPossibilities = 0;
    cages.forEach(c => totalPossibilities += calculateCagePossibilities(c, size));

    const logicalDensity = totalPossibilities / (size * size);
    const computationalLog = Math.log10(complexity || 1);
    const score = (logicalDensity * 150) + (computationalLog * 40);

    if (score <= 100) return { label: "Easy", color: "emerald", score, status: "Valid" };
    if (score <= 180) return { label: "Medium", color: "teal", score, status: "Valid" };
    if (score <= 260) return { label: "Hard", color: "blue", score, status: "Valid" };
    if (score <= 340) return { label: "Vicious", color: "indigo", score, status: "Valid" };
    if (score <= 420) return { label: "Devilish", color: "rose", score, status: "Valid" };
    return { label: "Diabolical", color: "red", score, status: "Valid" };
}
