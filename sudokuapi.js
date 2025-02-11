let solution;
const urlParams = new URLSearchParams(window.location.search);
const givens = parseInt(urlParams.get('givens')) || (50 - Math.floor(parseFloat(urlParams.get('difficulty') || 0) * 6.25)) || Math.floor(Math.random() * 17) / 4;

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

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Swap numbers based on a shuffled array of 1-9
function swapNumbers(base) {
    const baseNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffledNumbers = shuffleArray([...baseNumbers]);

    // Map each cell in the base solution to a shuffled number
    return base.map(row => row.map(cell => shuffledNumbers[cell - 1]));
}

// Rotate the grid 90 degrees clockwise
function rotateGrid(grid) {
    return grid[0].map((_, colIndex) => grid.map(row => row[colIndex])).reverse();
}

// Flip the grid horizontally
function flipGrid(grid) {
    return grid.map(row => row.reverse());
}

// Remove numbers to create the puzzle based on givens
function createPuzzle(base) {
    let newBase = base.map(row => [...row]); // Clone the base grid
    let numbersToRemove = 81 - givens; // Calculate how many cells to remove

    // Randomly remove numbers until the puzzle has the desired number of givens
    while (numbersToRemove > 0) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);

        if (newBase[row][col] !== 0) {
            newBase[row][col] = 0;
            numbersToRemove--;
        }
    }

    return newBase;
}

// Check if a puzzle has a unique solution (using a solver library)
function hasUniqueSolution(puzzleString) {
    const solver = createSolver(puzzleString);
    const solutions = solver.findSolutions(2);
    return solutions.length === 1;
}

// Generate a valid Sudoku puzzle with a unique solution
function generateSudokuPuzzle() {
    // Start with the base solution
    solution = baseSolution;

    // Apply random transformations (number swapping, rotation, and/or flipping)
    solution = swapNumbers(solution);
    if (Math.random() > 0.5) solution = rotateGrid(solution);
    if (Math.random() > 0.5) solution = flipGrid(solution);

    // Create the puzzle by removing numbers
    let grid = createPuzzle(solution);

    // Convert the grid to a string format for uniqueness check
    let puzzleString = grid.flat().map(cell => cell === 0 ? "." : cell).join("");

    // Ensure the puzzle has a unique solution
    if (hasUniqueSolution(puzzleString)) {
        return grid;
    } else {
        // Retry if the puzzle does not have a unique solution
        return generateSudokuPuzzle();
    }
}
