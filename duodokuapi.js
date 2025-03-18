class DuoDoKuGenerator {
    constructor() {
        this.mPuzzle = Array.from({ length: 8 }, () => Array(8).fill(0));
        
        this.block0 = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]];
        this.block1 = [[0, 4], [0, 5], [0, 6], [0, 7], [1, 4], [1, 5], [1, 6], [1, 7]];
        this.block2 = [[2, 0], [2, 1], [2, 2], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]];
        this.block3 = [[2, 4], [2, 5], [2, 6], [2, 7], [3, 4], [3, 5], [3, 6], [3, 7]];
        this.block4 = [[4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [5, 3]];
        this.block5 = [[4, 4], [4, 5], [4, 6], [4, 7], [5, 4], [5, 5], [5, 6], [5, 7]];
        this.block6 = [[6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2], [7, 3]];
        this.block7 = [[6, 4], [6, 5], [6, 6], [6, 7], [7, 4], [7, 5], [7, 6], [7, 7]];

        this.blocks = [this.block0, this.block1, this.block2, this.block3, this.block4, this.block5, this.block6, this.block7];
        
        this.seedCells = [[0, 0], [0, 7], [2, 2], [7, 0], [7, 7]];
        this.numbers = [2, 3, 1, 4];
        this.seedPuzzle = Array.from({ length: 8 }, () => Array(8).fill(0));

        this.isSolutionGenerated = false;
        this.solutionCount = 0;
    }

    block(r, c) {
        if (r >= 0 && r < 2 && c >= 0 && c < 4) return 0;
        if (r >= 0 && r < 2) return 1;
        if (r >= 2 && r < 4 && c >= 0 && c < 4) return 2;
        if (r >= 2 && r < 4) return 3;
        if (r >= 4 && r < 6 && c >= 0 && c < 4) return 4;
        if (r >= 4 && r < 6) return 5;
        if (c >= 0 && c < 4) return 6;
        return 7;
    }

    rG(b, j) {
        return this.blocks[b][j][0];
    }

    cG(b, j) {
        return this.blocks[b][j][1];
    }

    isNotDuplicated(row, column, digit, puzzle) {
        let instances = 0;
        for (let c = 0; c < 8; c++) {
            if (c === column) continue;
            if (puzzle[row][c] === digit) instances++;
            if (instances >= 2) return false;
        }

        instances = 0;
        for (let r = 0; r < 8; r++) {
            if (r === row) continue;
            if (puzzle[r][column] === digit) instances++;
            if (instances >= 2) return false;
        }

        instances = 0;
        let b = this.block(row, column);
        for (let j = 0; j < 8; j++) {
            if (this.rG(b, j) === row && this.cG(b, j) === column) continue;
            if (puzzle[this.rG(b, j)][this.cG(b, j)] === digit) instances++;
            if (instances >= 2) return false;
        }

        let neighbors = [];
        if (row - 1 >= 0) neighbors.push([row - 1, column]);
        if (column + 1 < 8) neighbors.push([row, column + 1]);
        if (row + 1 < 8) neighbors.push([row + 1, column]);
        if (column - 1 >= 0) neighbors.push([row, column - 1]);

        for (let neighbor of neighbors) {
            if (puzzle[neighbor[0]][neighbor[1]] === digit) return false;
        }

        return true;
    }

    generateSeedPuzzle() {
        for (let cell of this.seedCells) {
            let num = 0;
            while (!this.isNotDuplicated(cell[0], cell[1], num, this.seedPuzzle)) {
                num = Math.floor(Math.random() * 4) + 1;
            }
            this.seedPuzzle[cell[0]][cell[1]] = num;
        }

        this.numbers.sort(() => Math.random() - 0.5);

        this.buildCompletePuzzle(0, 0);
    }

    buildCompletePuzzle(r, c) {
        if (r === 8) {
            this.isSolutionGenerated = true;
            return;
        }

        if (this.seedPuzzle[r][c] !== 0) {
            if (this.isNotDuplicated(r, c, this.seedPuzzle[r][c], this.mPuzzle)) {
                this.mPuzzle[r][c] = this.seedPuzzle[r][c];
                if (c !== 7) {
                    this.buildCompletePuzzle(r, c + 1);
                } else {
                    this.buildCompletePuzzle(r + 1, 0);
                }
                if (this.isSolutionGenerated) return;
                this.mPuzzle[r][c] = 0;
            }
        } else {
            for (let number of this.numbers) {
                if (this.isNotDuplicated(r, c, number, this.mPuzzle)) {
                    this.mPuzzle[r][c] = number;
                    if (c !== 7) {
                        this.buildCompletePuzzle(r, c + 1);
                    } else {
                        this.buildCompletePuzzle(r + 1, 0);
                    }
                    if (this.isSolutionGenerated) return;
                    this.mPuzzle[r][c] = 0;
                }
            }
        }
    }

    checkUniqueness(r, c, puz, sol) {
        if (r === 8) {
            this.solutionCount++;
            return;
        }

        if (puz[r][c] !== 0) {
            if (this.isNotDuplicated(r, c, puz[r][c], sol)) {
                sol[r][c] = puz[r][c];
                if (c !== 7) {
                    this.checkUniqueness(r, c + 1, puz, sol);
                } else {
                    this.checkUniqueness(r + 1, 0, puz, sol);
                }
                if (this.solutionCount > 1) return;
                sol[r][c] = 0;
            }
        } else {
            for (let n = 1; n <= 4; n++) {
                if (this.isNotDuplicated(r, c, n, sol)) {
                    sol[r][c] = n;
                    if (c !== 7) {
                        this.checkUniqueness(r, c + 1, puz, sol);
                    } else {
                        this.checkUniqueness(r + 1, 0, puz, sol);
                    }
                    if (this.solutionCount > 1) return;
                    sol[r][c] = 0;
                }
            }
        }
    }

    generatePuzzle(minNoOfClues) {
        let completedGrid = this.mPuzzle.map(row => row.slice());
        let removed = Array.from({ length: 8 }, () => Array(8).fill(false));
        let noOfDigitsExplored = 0;

        while (noOfDigitsExplored < 64 - minNoOfClues) {
            let row = Math.floor(Math.random() * 8);
            let col = Math.floor(Math.random() * 8);
            if (removed[row][col]) continue;
            else {
                removed[row][col] = true;
                noOfDigitsExplored++;
            }

            this.mPuzzle[row][col] = 0;
            this.solutionCount = 0;
            this.checkUniqueness(0, 0, this.mPuzzle, Array.from({ length: 8 }, () => Array(8).fill(0)));

            if (this.solutionCount !== 1) {
                this.mPuzzle[row][col] = completedGrid[row][col];
            }
        }
    }
}
