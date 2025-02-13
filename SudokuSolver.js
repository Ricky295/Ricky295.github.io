//Thanks @svencodes on discord for this help! Even if it doesnt seem like much, its very helpful! Thanks a lot!

// new, simple, fast and optimized sudokukukukuku sssolverrrr :D
class SudokuSolver {
    constructor() {
        this.size = 9;
    }

    isValid(board, row, col, num) {
        // Check row
        for (let x = 0; x < this.size; x++) {
            if (board[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < this.size; x++) {
            if (board[x][col] === num) return false;
        }

        // Check 3x3 box
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] === num) return false;
            }
        }

        return true;
    }

    solve(board) {
        let row = 0;
        let col = 0;
        let isEmpty = false;
        
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (board[i][j] === 0) {
                    row = i;
                    col = j;
                    isEmpty = true;
                    break;
                }
            }
            if (isEmpty) break;
        }

        if (!isEmpty) return true;

        for (let num = 1; num <= this.size; num++) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this.solve(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }
}