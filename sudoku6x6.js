class Sudoku6x6 {
  constructor() {
    this.size = 6;
    this.blockRows = 2;
    this.blockCols = 3;
    this.nums = [1, 2, 3, 4, 5, 6];
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  isSafe(board, row, col, num) {
    for (let i = 0; i < this.size; i++) {
      if (board[row][i] === num) return false;
      if (board[i][col] === num) return false;
    }
    const startRow = row - (row % this.blockRows);
    const startCol = col - (col % this.blockCols);
    for (let r = 0; r < this.blockRows; r++) {
      for (let c = 0; c < this.blockCols; c++) {
        if (board[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  solve(board, countSolutions = false, limit = 2) {
    let solutions = 0;

    const helper = () => {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (board[r][c] === 0) {
            for (let num of this.nums) {
              if (this.isSafe(board, r, c, num)) {
                board[r][c] = num;
                if (helper()) return true;
                board[r][c] = 0;
              }
            }
            return false;
          }
        }
      }
      solutions++;
      if (!countSolutions) return true;
      return solutions >= limit;
    };

    const result = helper();
    if (countSolutions) return solutions;
    return result;
  }

  generateSudoku(clues = 15, asString = false) {
    let board = Array.from({ length: this.size }, () =>
      Array(this.size).fill(0)
    );
    this.solve(board);

    let cells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        cells.push([r, c]);
      }
    }
    this.shuffle(cells);

    let cluesLeft = this.size * this.size;
    for (let [r, c] of cells) {
      if (cluesLeft <= clues) break;

      let backup = board[r][c];
      board[r][c] = 0;

      const boardCopy = board.map(row => row.slice());
      const solutions = this.solve(boardCopy, true, 2);
      if (solutions !== 1) {
        board[r][c] = backup;
      } else {
        cluesLeft--;
      }
    }

    return asString ? this.convertToString(board) : board;
  }

  convertToString(board) {
    return board.flat().map(n => (n === 0 ? "." : n)).join("");
  }

  convertToArray(s) {
    if (s.length !== this.size * this.size)
      throw new Error("Input string length must be 36");
    let board = [];
    for (let i = 0; i < this.size; i++) {
      let row = [];
      for (let j = 0; j < this.size; j++) {
        const ch = s[i * this.size + j];
        if (ch === "." || ch === "0") row.push(0);
        else {
          const n = parseInt(ch, 10);
          if (n < 1 || n > 6) throw new Error("Invalid digit in input");
          row.push(n);
        }
      }
      board.push(row);
    }
    return board;
  }

  solveFromString(s) {
    const board = this.convertToArray(s);
    if (this.solve(board)) return board;
    else throw new Error("No solution found");
  }

  solveFromArray(board) {
    const copy = board.map(row => row.slice());
    if (this.solve(copy)) return copy;
    else throw new Error("No solution found");
  }
}
/*
// Usage example:

const sudoku = new Sudoku6x6();

// Generate puzzle as array
const puzzleArray = sudoku.generateSudoku(15);
console.log("Puzzle as array:");
console.table(puzzleArray);

// Generate puzzle as string
const puzzleString = sudoku.generateSudoku(15, true);
console.log("Puzzle as string:");
console.log(puzzleString);

// Convert string back to array
const arrFromString = sudoku.convertToArray(puzzleString);
console.log("Converted back to array:");
console.table(arrFromString);

// Solve from string
try {
  const solvedFromString = sudoku.solveFromString(puzzleString);
  console.log("Solved from string:");
  console.table(solvedFromString);
} catch (e) {
  console.error(e.message);
}

// Solve from array
try {
  const solvedFromArray = sudoku.solveFromArray(puzzleArray);
  console.log("Solved from array:");
  console.table(solvedFromArray);
} catch (e) {
  console.error(e.message);
}

*/
