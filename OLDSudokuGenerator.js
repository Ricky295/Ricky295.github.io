// and tadaaaa, a sudoku generator
class SudokuGenerator {
    constructor() {
        this.baseSolution = [
            [5,3,4,6,7,8,9,1,2],
            [6,7,2,1,9,5,3,4,8],
            [1,9,8,3,4,2,5,6,7],
            [8,5,9,7,6,1,4,2,3],
            [4,2,6,8,5,3,7,9,1],
            [7,1,3,9,2,4,8,5,6],
            [9,6,1,5,3,7,2,8,4],
            [2,8,7,4,1,9,6,3,5],
            [3,4,5,2,8,6,1,7,9]
        ];
        this.solver = new SudokuSolver();
    }

    // i have hereforth improved this seeded random number generator using xoshiro128** algorithm :D (thank you stackoverflow)
    seededRandom(seed) {
        let a = seed;
        let b = 123456789;
        let c = 987654321;
        let d = 567890123;
        
        const rotl = (x, k) => (x << k) | (x >>> (32 - k));
        
        return () => {
            const result = rotl(b * 5, 7) * 9;
            const t = b << 9;
            c ^= a;
            d ^= b;
            b ^= c;
            a ^= d;
            c ^= t;
            d = rotl(d, 11);
            return (result >>> 0) / 4294967296;
        };
    }

    // handy dandy function to calculate puzzle difficulty based on day and level
    calculateDifficulty(day, level) {
        const random = this.seededRandom(day);
        const difficulties = Array(6).fill(0)
            .map((_, i) => Math.floor(random() * 17) / 4);
        difficulties.sort((a, b) => a - b);
        return difficulties[level];
    }

    // (do the shuffle fr) shuffle array using Fisher-Yates algorithm with seeded random(again, thank you stackoverflow 🙏)
    shuffleArray(array, random) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // function to do a lil swapping of numbers in the grid
    swapNumbers(grid, random) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffled = this.shuffleArray(numbers, random);
        return grid.map(row => 
            row.map(cell => shuffled[cell - 1])
        );
    }

    // rotate grid, simple. wouldnt this technically be reverse tho?
    rotateGrid(grid) {
        return grid[0].map((_, i) => 
            grid.map(row => row[i]).reverse()
        );
    }

    // Flip grid horizontally(uh isnt this what i just made up there, oh nvm)
    flipGrid(grid) {
        return grid.map(row => [...row].reverse());
    }

    // create puzzle by removing numbers, esnsururueding for a la uh idfk like a puzzle or something
    createPuzzle(grid, givens, random) {
        const puzzle = grid.map(row => [...row]);
        const cellsToRemove = 81 - givens;
        const allCells = Array(81).fill(0).map((_, i) => i);
        const shuffledCells = this.shuffleArray(allCells, random);
        
        // loop, Remove numbers while maintaining uniqueness
        for (let i = 0; i < cellsToRemove; i++) {
            const cellIndex = shuffledCells[i];
            const row = Math.floor(cellIndex / 9);
            const col = cellIndex % 9;
            const temp = puzzle[row][col];
            puzzle[row][col] = 0;

            // must make sure to check if puzzle still has unique solution
            const puzzleString = puzzle.flat().map(cell => 
                cell === 0 ? '.' : cell
            ).join('');


            // reset if we are stupid
            if (!this.hasUniqueSolution(puzzleString)) {
                puzzle[row][col] = temp;
            }
        }
        
        return puzzle;
    }

    // Check if puzzle has unique solution(self explanatory)
    hasUniqueSolution(puzzleString) {
        this.solver.initializePuzzle(puzzleString);
        const solutions = this.solver.findSolutions(2);
        return solutions.length === 1;
    }

    // Generate complete sudoku puzzle(again, self explanatory)
    generatePuzzle(day, difficulty) {
        const random = this.seededRandom(day);
        const randGen = random();
        
        // gota make sure tp calculate number of givens based on difficulty
        const difficultyValue = this.calculateDifficulty(day, difficulty);
        const givens = Math.max(
            41 - (difficultyValue * 4),
            50 - (difficultyValue * 8)
        );

        // create transformed grid with uhhhhhh stuff idfk
        let grid = this.swapNumbers([...this.baseSolution], randGen);
        
        // initiate: random transformations!!1!
        if (Math.random() > 0.5) {
            grid = this.rotateGrid(grid);
        }
        if (Math.random() % 0.5 > 0.25) {
            grid = this.flipGrid(grid);
        }

        // then, create puzzle with proper difficulty
        const puzzle = this.createPuzzle(grid, givens, randGen);
        const puzzleString = puzzle.flat().map(cell => 
            cell === 0 ? '.' : cell
        ).join('');

        // again, ensure puzzle has unique solution
        if (this.hasUniqueSolution(puzzleString)) {
            return puzzle;
        }
        
        // IF puzzle doesn't have unique solution, try again
        return this.generatePuzzle(day, difficulty);
    }

    // Generate a batch of puzzles for caching(idfk if this is nesecary or nawt)
    generatePuzzleBatch(startDay, numDays, difficulties) {
        const puzzles = new Map();
        
        for (let day = startDay; day < startDay + numDays; day++) {
            puzzles.set(day, {});
            for (const difficulty of difficulties) {
                const puzzle = this.generatePuzzle(day, difficulty);
                puzzles.get(day)[difficulty] = puzzle;
            }
        }
        
        return puzzles;
    }

    // Validate a complete grid(self explanatory!!!!!!)
    validateGrid(grid) {
        const isValid = (arr) => {
            const seen = new Set();
            for (const num of arr) {
                if (num !== 0 && seen.has(num)) return false;
                seen.add(num);
            }
            return true;
        };

        // loop here, check rows
        for (const row of grid) {
            if (!isValid(row)) return false;
        }

        // loop here, check columns
        for (let col = 0; col < 9; col++) {
            const column = grid.map(row => row[col]);
            if (!isValid(column)) return false;
        }

        // loop here, check boxes
        for (let box = 0; box < 9; box++) {
            const boxRow = Math.floor(box / 3) * 3;
            const boxCol = (box % 3) * 3;
            const boxNums = [];
            
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    boxNums.push(grid[boxRow + i][boxCol + j]);
                }
            }
            
            if (!isValid(boxNums)) return false;
        }

        return true;
    }

    // handy dandy lil func ta get difficulty description
    getDifficultyDescription(difficulty) {
        const descriptions = {
            0: "Very Easy",
            1: "Easy",
            2: "Medium",
            3: "Hard",
            4: "Very Hard",
            5: "Expert"
        };
        return descriptions[difficulty] || "Unknown";
    }

    // get za hints for current puzzle state
    getHints(puzzle, maxHints = 3) {
        const flattened = puzzle.flat();
        const solution = this.solver.findSolutions(1)[0];
        if (!solution) return [];

        const hints = [];
        const solutionArray = solution.split('');

        // find empty cells that could indeed be filled but are not
        for (let i = 0; i < 81 && hints.length < maxHints; i++) {
            if (flattened[i] === 0 || flattened[i] === '.') {
                const row = Math.floor(i / 9);
                const col = i % 9;
                hints.push({
                    row,
                    col,
                    value: parseInt(solutionArray[i]),
                    message: `Try putting ${solutionArray[i]} in row ${row + 1}, column ${col + 1}`
                });
            }
        }

        return hints;
    }
}

// (unused?)Helper function to format puzzle for display
function formatPuzzle(puzzle) {
    return puzzle.map(row => 
        row.map(cell => cell || '.').join('')
    ).join('\n');
}

// (unused?)Helper function to parse puzzle string
function parsePuzzle(puzzleString) {
    return puzzleString
        .split('\n')
        .map(row => 
            row.split('')
               .map(cell => cell === '.' ? 0 : parseInt(cell))
        );
}