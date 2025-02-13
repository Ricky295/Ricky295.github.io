//Thanks @svencodes on discord for this help! Even if it doesnt seem like much, its very helpful! Thanks a lot!

// new and optimized sudokukukukuku sssolverrrr :D
class SudokuSolver {
    constructor(puzzle) {
        this.digits = '123456789';
        this.puzzle729 = new Array(729);
        this.cellMap = this.buildCellMap();
        
        if (puzzle) {
            this.initializePuzzle(puzzle);
        }
    }

    // must initialize puzzle state, i forgor
    initializePuzzle(puzzle81) {
        const puzzleArray = typeof puzzle81 === 'string' ? puzzle81.split('') : puzzle81;
        puzzleArray.forEach((value, cellIndex) => {
            this.digits.split('').forEach((digit, digitIndex) => {
                this.puzzle729[cellIndex * 9 + digitIndex] = value === '.' || value === '0' 
                    ? digit 
                    : (digit === value ? value : '.');
            });
        });
    }

    // function for building optimized cell mapping for constraints n stuf
    buildCellMap() {
        const cellMap = new Array(81);
        for (let i = 0; i < 81; i++) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            const targetCells = new Set();

            // here we add row constraints
            for (let j = 0; j < 9; j++) {
                targetCells.add(row * 9 + j);  // Row peers(aka neighbors)
                targetCells.add(j * 9 + col);  // Column peers(again, aka neighbors)
                targetCells.add((boxRow + Math.floor(j / 3)) * 9 + boxCol + (j % 3)); // Box peers
            }

            targetCells.delete(i); // Remove self(what else would this do)
            cellMap[i] = Array.from(targetCells).sort((a, b) => a - b);
        }
        return cellMap;
    }

    // get value for a cell, self explanatory
    getValue(cellIndex) {
        const values = [];
        const startIdx = cellIndex * 9;
        for (let i = 0; i < 9; i++) {
            if (this.puzzle729[startIdx + i] !== '.') {
                values.push(this.puzzle729[startIdx + i]);
            }
        }
        return values.join('');
    }

    // set value for a cell, again, self explanatory
    setValue(cellIndex, value) {
        const startIdx = cellIndex * 9;
        for (let i = 0; i < 9; i++) {
            this.puzzle729[startIdx + i] = String(i + 1) === value ? value : '.';
        }
    }

    // handy dandy function to convert current state to 81-character string
    toPuzzle81() {
        const puzzle81 = new Array(81);
        for (let i = 0; i < 81; i++) {
            const val = this.getValue(i);
            puzzle81[i] = val.length === 1 ? val : '.';
        }
        return puzzle81.join('');
    }

    // check for invalid cells, self explanatory, AGAIN
    hasInvalidCells() {
        for (let i = 0; i < 81; i++) {
            let valueCount = 0;
            for (let di = 0; di < 9; di++) {
                if (this.puzzle729[i * 9 + di] !== '.') valueCount++;
            }
            if (valueCount === 0) return true;
        }
        return false;
    }

    // ig we have to add func update candidates based on current state
    updateCandidates() {
        for (let i = 0; i < 81; i++) {
            const value = this.getValue(i);
            if (value.length === 1) {
                const peers = this.cellMap[i];
                const digit = parseInt(value) - 1;
                for (const peer of peers) {
                    this.puzzle729[peer * 9 + digit] = '.';
                }
            }
        }
    }

    // Find hidden singles in rows, columns, and boxes
    findHiddenSingles() {
        const hiddenSingles = new Map();
        const counters = {
            row: Array.from({ length: 9 }, () => Array(9).fill(0)),
            col: Array.from({ length: 9 }, () => Array(9).fill(0)),
            box: Array.from({ length: 9 }, () => Array(9).fill(0))
        };

        // loop ta count candidates in each house :3
        for (let i = 0; i < 81; i++) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

            for (let digit = 0; digit < 9; digit++) {
                if (this.puzzle729[i * 9 + digit] !== '.') {
                    counters.row[row][digit]++;
                    counters.col[col][digit]++;
                    counters.box[box][digit]++;
                }
            }
        }

        // loop for finding hidden singles
        for (let house = 0; house < 9; house++) {
            for (let digit = 0; digit < 9; digit++) {
                const value = String(digit + 1);
                
                // checking rows
                if (counters.row[house][digit] === 1) {
                    for (let col = 0; col < 9; col++) {
                        const cellIndex = house * 9 + col;
                        if (this.puzzle729[cellIndex * 9 + digit] !== '.' && 
                            this.getValue(cellIndex) !== value) {
                            hiddenSingles.set(cellIndex, value);
                        }
                    }
                }

                // then check columns
                if (counters.col[house][digit] === 1) {
                    for (let row = 0; row < 9; row++) {
                        const cellIndex = row * 9 + house;
                        if (this.puzzle729[cellIndex * 9 + digit] !== '.' && 
                            this.getValue(cellIndex) !== value) {
                            hiddenSingles.set(cellIndex, value);
                        }
                    }
                }

                // and finally, check boxes
                if (counters.box[house][digit] === 1) {
                    const boxRow = Math.floor(house / 3) * 3;
                    const boxCol = (house % 3) * 3;
                    for (let i = 0; i < 9; i++) {
                        const cellIndex = (boxRow + Math.floor(i / 3)) * 9 + (boxCol + (i % 3));
                        if (this.puzzle729[cellIndex * 9 + digit] !== '.' && 
                            this.getValue(cellIndex) !== value) {
                            hiddenSingles.set(cellIndex, value);
                        }
                    }
                }
            }
        }

        return hiddenSingles;
    }

    // to solve singles (both naked and hidden(i think))
    solveSingles() {
        let progress = true;
        while (progress) {
            progress = false;
            this.updateCandidates();
            
            const hiddenSingles = this.findHiddenSingles();
            if (hiddenSingles.size > 0) {
                progress = true;
                for (const [cellIndex, value] of hiddenSingles) {
                    this.setValue(cellIndex, value);
                }
            }
        }
    }

    // find all solutions up to maxSolutions
    findSolutions(maxSolutions = 1) {
        const solutions = [];
        
        const findNextSolution = (cellIndex = 0) => {
            this.solveSingles();
            if (this.hasInvalidCells()) return false;

            // Find next cell to try
            while (cellIndex < 81 && this.getValue(cellIndex).length <= 1) {
                cellIndex++;
            }

            if (cellIndex >= 81) {
                solutions.push(this.toPuzzle81());
                return true;
            }

            // Try each possible value
            const savedState = [...this.puzzle729];
            for (let digit = 0; digit < 9; digit++) {
                if (this.puzzle729[cellIndex * 9 + digit] !== '.') {
                    this.puzzle729 = [...savedState];
                    this.setValue(cellIndex, String(digit + 1));
                    
                    const found = findNextSolution(cellIndex + 1);
                    if (found && maxSolutions > 0 && solutions.length >= maxSolutions) {
                        return true;
                    }
                }
            }
            this.puzzle729 = savedState;
            return false;
        };

        findNextSolution(0);
        return solutions;
    }
}