let solution;
let givens;
let seed;

function seededRandom(seed) {
    let a = 0.15873;
    let b = 1 + (((a % 0.073)/0.073) / 2);
    return ((seed**b)%a)/a;
}

const baseSolution = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

function calculateDifficulty(day, difficulty) {
    seed = day; 
    const random = seededRandom(seed);
    const difficulties = [];

    for (let i = 0; i < 6; i++) {
        difficulties.push(Math.floor(seededRandom(seed * 6 + i) * 17) / 4);
    }

    difficulties.sort((a, b) => a - b);
    console.log("Difficulties: " + difficulties[difficulty])
    return difficulties[difficulty];
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function swapNumbers(base) {
    const baseNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledNumbers = shuffleArray([...baseNumbers]);

    return base.map(row => row.map(cell => shuffledNumbers[cell - 1]));
}

function rotateGrid(grid) {
    return grid[0].map((_, colIndex) => grid.map(row => row[colIndex])).reverse();
}

function flipGrid(grid) {
    return grid.map(row => row.reverse());
}

function createPuzzle(base) {
    let newBase = base.map(row => [...row]);
    let numbersToRemove = 81 - givens;
    let i = 0;

    while (numbersToRemove > 0) {
        const row = Math.floor(seededRandom(seed + i) * 9);
        const col = Math.floor(seededRandom(seed + i * Math.sqrt(3)) * 9);

        if (newBase[row][col] !== 0) {
            newBase[row][col] = 0;
            numbersToRemove--;
        }
        i++;
    }

    return newBase;
}

function hasUniqueSolution(puzzleString) {
    const solver = createSolver(puzzleString);
    const solutions = solver.findSolutions(2);
    return solutions.length === 1;
}

function generateSudokuPuzzle(day, dailyDifficulty) {
    solution = baseSolution;
    givens = Math.max(41 - (dailyDifficulty * 4), 50 - (dailyDifficulty * 8));

    const difficulty = calculateDifficulty(day, dailyDifficulty);

    solution = swapNumbers(solution);
    if (seededRandom(seed) > 0.5) solution = rotateGrid(solution);
    if (seededRandom(seed) % 0.5 > 0.25) solution = flipGrid(solution);

    let grid = createPuzzle(solution);
    let puzzleString = grid.flat().map(cell => cell === 0 ? "." : cell).join("");

    if (hasUniqueSolution(puzzleString)) {
        return grid;
    } else {
        return generateSudokuPuzzle(day, dailyDifficulty); // Retry with same parameters
    }
}

console.log(generateSudokuPuzzle(123, 2)); // Example usage
