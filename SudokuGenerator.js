//youre welcome :3333
class SudokuGenerator {
    constructor(difficulty) {
        this.solver = new SudokuSolver();
        this.size = 9;
        this.difficulty = difficulty;
        this.randomSeed = this.getPuzzleSeed(this.difficulty);
    }

    getPuzzleSeed(difficulty) {
        const currentDate = new Date();

        const startDate = new Date(2000, 0, 1);  // Months are 0-indexed, so 0 represents January (i did not know this originally)

        const timeDifference = currentDate - startDate;

        const dayamount = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

        return Math.round(this.seededRandom(dayamount * difficulty) * 10000) + dayamount * difficulty;
    }

    seededRandom(seed) {
        let a = 1664525;
        let c = 1013904223;
        let m = Math.pow(2, 32); // 2^32
        seed = (seed * a + c) % m;
        return seed / m;  // Returns a random number between 0 and 1
    }

    generatePuzzle(difficulty) {
        this.randomSeed = this.getPuzzleSeed(difficulty);
        const solved = this.generateSolvedGrid();
        return this.createPuzzleFromSolution(solved, difficulty);
    }

    generateSolvedGrid() {
        const grid = Array(9).fill().map(() => Array(9).fill(0));
        
        // first and foremost, we fill the diagonal boxes
        for (let box = 0; box < 9; box += 3) {
            this.fillBox(grid, box, box);
        }
        
        // ...then we can solve the rest.
        this.solver.solve(grid);
        return grid;
    }

    fillBox(grid, row, col) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const randomIndex = Math.floor(this.seededRandom(this.randomSeed) * numbers.length);
                grid[row + i][col + j] = numbers[randomIndex];
                numbers.splice(randomIndex, 1);
            }
        }
    }

    createPuzzleFromSolution(solved, difficulty) {
        this.randomSeed = this.getPuzzleSeed(difficulty);
        const puzzle = solved.map(row => [...row]);
        const cellsToRemove = 20 + (difficulty * 7);
        
        let attempts = cellsToRemove;
        while (attempts > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                attempts--;
            }
        }
        
        return puzzle;
    }
}
