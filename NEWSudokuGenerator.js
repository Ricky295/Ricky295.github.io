// NEWSudokuGenerator.js
class NEWSudokuGenerator {
  constructor() {
    this.grid = Array(9).fill().map(() => Array(9).fill(0));
  }

  // Seeded random function for consistent daily puzzles
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Get seed based on a specific date
  getDateSeed(year, month, day) {
    return year * 10000 + month * 100 + day;
  }

  // Get today's seed based on current date
  getTodaySeed() {
    const now = new Date();
    return this.getDateSeed(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  // Check if num is valid at position
  isValid(row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (this.grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (this.grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[boxRow + i][boxCol + j] === num) return false;
      }
    }

    return true;
  }

  // Solve the grid using backtracking
  solve(row = 0, col = 0) {
    if (row === 9) return true;
    
    if (col === 9) return this.solve(row + 1, 0);
    
    if (this.grid[row][col] !== 0) return this.solve(row, col + 1);
    
    for (let num = 1; num <= 9; num++) {
      if (this.isValid(row, col, num)) {
        this.grid[row][col] = num;
        
        if (this.solve(row, col + 1)) return true;
        
        this.grid[row][col] = 0;
      }
    }
    
    return false;
  }

  // Fill a valid solved grid
  fillGrid(seed) {
    // Clear the grid
    this.grid = Array(9).fill().map(() => Array(9).fill(0));
    
    // Create a random but valid filled grid
    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    // Use seed for consistent randomization
    if (seed !== undefined) {
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }
    } else {
      numbers = numbers.sort(() => Math.random() - 0.5);
    }
    
    // Fill in first row with shuffled numbers
    for (let i = 0; i < 9; i++) {
      this.grid[0][i] = numbers[i];
    }
    
    // Solve the rest of the grid
    this.solve();
    
    return this.grid;
  }

  // Count solutions for a given grid
  countSolutions(grid) {
    let solutions = 0;
    const emptyCells = [];
    
    // Find all empty cells
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }
    
    const search = (index) => {
      // Base case: all cells filled
      if (index >= emptyCells.length) {
        solutions++;
        return;
      }
      
      // If we found more than one solution, we can stop
      if (solutions > 1) return;
      
      const [row, col] = emptyCells[index];
      
      // Try each number
      for (let num = 1; num <= 9; num++) {
        if (this.isValidInGrid(grid, row, col, num)) {
          grid[row][col] = num;
          search(index + 1);
          grid[row][col] = 0;
        }
      }
    };
    
    search(0);
    return solutions;
  }
  
  // Check if num is valid at position in the specified grid
  isValidInGrid(grid, row, col, num) {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[boxRow + i][boxCol + j] === num) return false;
      }
    }

    return true;
  }

  // Convert difficulty level to number of givens
  difficultyToGivens(difficulty) {
    // Custom difficulty scale with support for 0.25 increments
    if (difficulty === 0) return 50;    // Easy
    if (difficulty <= 1) return Math.round(50 - ((difficulty) * (50-42) / 1)); // Between Easy and Medium
    if (difficulty <= 2) return Math.round(42 - ((difficulty-1) * (42-34) / 1)); // Between Medium and Hard
    if (difficulty <= 3) return Math.round(34 - ((difficulty-2) * (34-29) / 1)); // Between Hard and Expert
    if (difficulty <= 4) return Math.round(29 - ((difficulty-3) * (29-25) / 1)); // Between Expert and Insane
    return 25; // Fallback for anything higher
  }

  // Create a puzzle by removing numbers while ensuring unique solution
  createPuzzle(difficulty, seed) {
    // Define default seed if not provided
    if (seed === undefined) {
      seed = Math.floor(Math.random() * 1000000);
    }
    
    // Create a fully solved grid
    this.fillGrid(seed);
    
    // Make a copy of the solved grid
    const solution = JSON.parse(JSON.stringify(this.grid));
    const puzzle = JSON.parse(JSON.stringify(this.grid));
    
    // Get number of givens based on difficulty
    const givens = this.difficultyToGivens(difficulty);
    
    // Calculate how many cells to remove
    const cellsToRemove = 81 - givens;
    
    // Create an array of all positions and shuffle it
    const positions = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        positions.push([row, col]);
      }
    }
    
    // Shuffle positions based on seed
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i * 100) * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Try to remove cells
    let removed = 0;
    for (const [row, col] of positions) {
      if (removed >= cellsToRemove) break;
      
      const temp = puzzle[row][col];
      puzzle[row][col] = 0;
      
      // Check if the puzzle still has a unique solution
      const numSolutions = this.countSolutions(JSON.parse(JSON.stringify(puzzle)));
      
      if (numSolutions === 1) {
        removed++;
      } else {
        // If not unique, put the number back
        puzzle[row][col] = temp;
      }
    }
    
    return { puzzle, solution, givens: 81 - removed };
  }

  // Create a daily puzzle based on a specific date
  createDailyPuzzle(year, month, day) {
    let seed;
    
    if (year && month && day) {
      // Use provided date
      seed = this.getDateSeed(year, month, day);
    } else {
      // Use today's date
      seed = this.getTodaySeed();
    }

    difficulty = Math.round(this.seededRandom(seed) * 17) / 4;
    
    return this.createPuzzle(difficulty, seed);
  }
  
  // Static method to format a grid as a string
  static formatGrid(grid) {
    let result = '';
    for (let row = 0; row < 9; row++) {
      if (row % 3 === 0 && row !== 0) {
        result += '------+-------+------\n';
      }
      for (let col = 0; col < 9; col++) {
        if (col % 3 === 0 && col !== 0) {
          result += '| ';
        }
        const cell = grid[row][col] || '.';
        result += cell + ' ';
      }
      result += '\n';
    }
    return result;
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NEWSudokuGenerator;
} else if (typeof window !== 'undefined') {
  window.NEWSudokuGenerator = NEWSudokuGenerator;
}
