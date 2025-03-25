class DuoDoKuSolver {
    constructor() {
        this.mPuzzle = Array.from({ length: 8 }, () => Array(8).fill(0));
        
        this.blocks = [
            [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]],
            [[0, 4], [0, 5], [0, 6], [0, 7], [1, 4], [1, 5], [1, 6], [1, 7]],
            [[2, 0], [2, 1], [2, 2], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]],
            [[2, 4], [2, 5], [2, 6], [2, 7], [3, 4], [3, 5], [3, 6], [3, 7]],
            [[4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [5, 3]],
            [[4, 4], [4, 5], [4, 6], [4, 7], [5, 4], [5, 5], [5, 6], [5, 7]],
            [[6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2], [7, 3]],
            [[6, 4], [6, 5], [6, 6], [6, 7], [7, 4], [7, 5], [7, 6], [7, 7]]
        ];

        this.solutionCount = 0;
        this.setOfSolutions = new Set();
    }

    block(r, c) {
        if (r >= 0 && r <= 1) {
            return c <= 3 ? 0 : 1;
        } else if (r >= 2 && r <= 3) {
            return c <= 3 ? 2 : 3;
        } else if (r >= 4 && r <= 5) {
            return c <= 3 ? 4 : 5;
        } else {
            return c <= 3 ? 6 : 7;
        }
    }

    rG(b, j) {
        return this.blocks[b][j][0];
    }

    cG(b, j) {
        return this.blocks[b][j][1];
    }

    isNotDuplicated(row, column, digit, puzzle) {
        let instances;

        // Check row
        instances = 0;
        for (let c = 0; c <= 7; c++) {
            if (c === column) continue;
            if (puzzle[row][c] === digit) instances++;
            if (instances >= 2) return false;
        }

        // Check column
        instances = 0;
        for (let r = 0; r <= 7; r++) {
            if (r === row) continue;
            if (puzzle[r][column] === digit) instances++;
            if (instances >= 2) return false;
        }

        // Check block
        instances = 0;
        const b = this.block(row, column);
        for (let j = 0; j <= 7; j++) {
            if (this.rG(b, j) === row && this.cG(b, j) === column) continue;
            if (puzzle[this.rG(b, j)][this.cG(b, j)] === digit) instances++;
            if (instances >= 2) return false;
        }

        // Check neighbors
        const neighbors = [];
        if (row - 1 >= 0) neighbors.push([row - 1, column]);
        if (column + 1 <= 7) neighbors.push([row, column + 1]);
        if (row + 1 <= 7) neighbors.push([row + 1, column]);
        if (column - 1 >= 0) neighbors.push([row, column - 1]);
        for (const neighbor of neighbors) {
            if (puzzle[neighbor[0]][neighbor[1]] === digit) return false;
        }

        return true;
    }

    enterPuzzle(input) {
        for (let r = 0; r <= 7; r++) {
            for (let c = 0; c <= 7; c++) {
                this.mPuzzle[r][c] = input[r][c];
            }
        }
        this.bruteForcePuzzle(0, 0, this.mPuzzle, Array.from({ length: 8 }, () => Array(8).fill(0)));
    }

    bruteForcePuzzle(r, c, puz, sol) {
    if (r === 8) {
        if (this.checkSolution(sol)) {
            this.solutionCount++;
            this.displayPuzzle(sol);
            return puz; // Return the puzzle after the first solution is found
        }
        return;
    }

    if (puz[r][c] !== 0) {
        if (this.isNotDuplicated(r, c, puz[r][c], sol)) {
            sol[r][c] = puz[r][c];
            if (c !== 7) {
                const result = this.bruteForcePuzzle(r, c + 1, puz, sol);
                if (result) return result; // Propagate the result back up if a solution is found
            } else {
                const result = this.bruteForcePuzzle(r + 1, 0, puz, sol);
                if (result) return result; // Propagate the result back up if a solution is found
            }
            sol[r][c] = 0;
        }
    } else {
        for (let n = 1; n <= 4; n++) {
            if (this.isNotDuplicated(r, c, n, sol)) {
                sol[r][c] = n;
                if (c !== 7) {
                    const result = this.bruteForcePuzzle(r, c + 1, puz, sol);
                    if (result) return result; // Propagate the result back up if a solution is found
                } else {
                    const result = this.bruteForcePuzzle(r + 1, 0, puz, sol);
                    if (result) return result; // Propagate the result back up if a solution is found
                }
                sol[r][c] = 0;
            }
        }
    }
}


    displayPuzzle(solution) {
        console.log(`Solution ${this.solutionCount}:`);
        for (let r = 0; r <= 7; r++) {
            let rowStr = '';
            for (let c = 0; c <= 7; c++) {
                rowStr += solution[r][c] + ' ';
            }
            console.log(rowStr);
        }
        console.log();
    }

    checkSolution(solution) {
        const s = Array.from({ length: 8 }, () => Array(8).fill(0));
        for (let r = 0; r <= 7; r++) {
            for (let c = 0; c <= 7; c++) {
                s[r][c] = solution[r][c];
            }
        }
        const count0 = this.setOfSolutions.size;
        this.setOfSolutions.add(JSON.stringify(s));
        return this.setOfSolutions.size !== count0;
    }
}
