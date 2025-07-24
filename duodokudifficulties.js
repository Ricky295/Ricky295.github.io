// Difficulty levels represented as an object
const Difficulty = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
    UNFAIR: 'UNFAIR'
};

// --- Helper Functions for Block Access ---
const blocks = [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]], // block0
    [[0, 4], [0, 5], [0, 6], [0, 7], [1, 4], [1, 5], [1, 6], [1, 7]], // block1
    [[2, 0], [2, 1], [2, 2], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]], // block2
    [[2, 4], [2, 5], [2, 6], [2, 7], [3, 4], [3, 5], [3, 6], [3, 7]], // block3
    [[4, 0], [4, 1], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [5, 3]], // block4
    [[4, 4], [4, 5], [4, 6], [4, 7], [5, 4], [5, 5], [5, 6], [5, 7]], // block5
    [[6, 0], [6, 1], [6, 2], [6, 3], [7, 0], [7, 1], [7, 2], [7, 3]], // block6
    [[6, 4], [6, 5], [6, 6], [6, 7], [7, 4], [7, 5], [7, 6], [7, 7]]  // block7
];

function rG(b, j) {
    return blocks[b][j][0];
}

function cG(b, j) {
    return blocks[b][j][1];
}

// --- Main Class ---
class duodokudifficulties {
    constructor() {
        this.smartHint = false;
        this.hintString = "";
    }

    // --- Candidate Management ---
    refreshCandidates(x, ps) {
        // Assuming DuoDoKuGenerator exists in JS with isNotDuplicated method
        const gen = new DuoDoKuGenerator(); 
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) continue;
                const toRemove = [];
                for (const candidate of ps[r][c]) {
                    if (!gen.isNotDuplicated(r, c, candidate, x)) {
                        toRemove.push(candidate);
                    }
                }
                // Remove candidates
                ps[r][c] = ps[r][c].filter(candidate => !toRemove.includes(candidate));
            }
        }
    }

    // --- Techniques ---

    fullHouse(x, ps) {
        // Row
        for (let r = 0; r < 8; r++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            let cIndex = -1;
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    cIndex = c;
                }
            }
            if (house.length === 1) {
                if (!this.smartHint) {
                    x[r][cIndex] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last digit in Row ${r + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            let rIndex = -1;
            for (let r = 0; r < 8; r++) {
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    rIndex = r;
                }
            }
            if (house.length === 1) {
                if (!this.smartHint) {
                    x[rIndex][c] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last digit in Column ${c + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            let bIndex = -1;
            for (let j = 0; j < 8; j++) {
                const r = rG(b, j);
                const c = cG(b, j);
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    bIndex = j;
                }
            }
            if (house.length === 1) {
                if (!this.smartHint) {
                    x[rG(b, bIndex)][cG(b, bIndex)] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last digit in Block ${b + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }
        return false;
    }

    lastTwin(x, ps) {
        // Row
        for (let r = 0; r < 8; r++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            const cIndices = [];
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    cIndices.push(c);
                }
            }
            // Check if two identical digits are missing
            if (house.length === 2 && new Set(house).size === 1) {
                if (!this.smartHint) {
                    x[r][cIndices[0]] = house[0];
                    x[r][cIndices[1]] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last twin in Row ${r + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            const rIndices = [];
            for (let r = 0; r < 8; r++) {
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    rIndices.push(r);
                }
            }
             // Check if two identical digits are missing
            if (house.length === 2 && new Set(house).size === 1) {
                if (!this.smartHint) {
                    x[rIndices[0]][c] = house[0];
                    x[rIndices[1]][c] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last twin in Column ${c + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            let house = [1, 1, 2, 2, 3, 3, 4, 4];
            const bIndices = [];
            for (let j = 0; j < 8; j++) {
                 const r = rG(b, j);
                 const c = cG(b, j);
                if (x[r][c] !== 0) {
                    const index = house.indexOf(x[r][c]);
                    if (index > -1) house.splice(index, 1);
                } else {
                    bIndices.push(j);
                }
            }
             // Check if two identical digits are missing
            if (house.length === 2 && new Set(house).size === 1) {
                if (!this.smartHint) {
                    x[rG(b, bIndices[0])][cG(b, bIndices[0])] = house[0];
                    x[rG(b, bIndices[1])][cG(b, bIndices[1])] = house[0];
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Last twin in Block ${b + 1}. Missing digit ${house[0]}.`;
                }
                return true;
            }
        }
        return false;
    }

    hiddenSingle(x, ps) {
        // Row
        for (let r = 0; r < 8; r++) {
            // Array of arrays to hold column indices for each candidate (1-4)
            const cIndices = Array.from({ length: 4 }, () => []);
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) continue;
                for (const candidate of ps[r][c]) {
                    cIndices[candidate - 1].push(c);
                }
            }
            for (let j = 0; j < 4; j++) {
                if (cIndices[j].length === 1) {
                    if (!this.smartHint) {
                        x[r][cIndices[j][0]] = j + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden single in Row ${r + 1}. Digit ${j + 1} in C${cIndices[j][0] + 1}.`;
                    }
                    return true;
                }
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
            const rIndices = Array.from({ length: 4 }, () => []);
            for (let r = 0; r < 8; r++) {
                if (x[r][c] !== 0) continue;
                for (const candidate of ps[r][c]) {
                    rIndices[candidate - 1].push(r);
                }
            }
            for (let j = 0; j < 4; j++) {
                if (rIndices[j].length === 1) {
                    if (!this.smartHint) {
                        x[rIndices[j][0]][c] = j + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden single in Column ${c + 1}. Digit ${j + 1} in R${rIndices[j][0] + 1}.`;
                    }
                    return true;
                }
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            const bIndices = Array.from({ length: 4 }, () => []);
            for (let j = 0; j < 8; j++) {
                 const r = rG(b, j);
                 const c = cG(b, j);
                if (x[r][c] !== 0) continue;
                for (const candidate of ps[r][c]) {
                    bIndices[candidate - 1].push(j);
                }
            }
            for (let k = 0; k < 4; k++) {
                if (bIndices[k].length === 1) {
                    if (!this.smartHint) {
                         const idx = bIndices[k][0];
                        x[rG(b, idx)][cG(b, idx)] = k + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden single in Block ${b + 1}. Digit ${k + 1} in P${bIndices[k][0] + 1}.`;
                    }
                    return true;
                }
            }
        }
        return false;
    }


    hiddenTwin(x, ps) {
        // Row
        for (let r = 0; r < 8; r++) {
            const cIndices = Array.from({ length: 4 }, () => []);
            const digitsPresent = new Set();
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) {
                    digitsPresent.add(x[r][c]);
                    continue;
                }
                for (const candidate of ps[r][c]) {
                    cIndices[candidate - 1].push(c);
                }
            }
            for (let j = 0; j < 4; j++) {
                // Check if candidate appears exactly twice and isn't already placed
                if (cIndices[j].length === 2 && !digitsPresent.has(j + 1)) {
                     if (!this.smartHint) {
                        x[r][cIndices[j][0]] = j + 1;
                        x[r][cIndices[j][1]] = j + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden twin in Row ${r + 1}. Digit ${j + 1} in C${cIndices[j][0] + 1}${cIndices[j][1] + 1}.`;
                    }
                    return true;
                }
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
            const rIndices = Array.from({ length: 4 }, () => []);
            const digitsPresent = new Set();
            for (let r = 0; r < 8; r++) {
                if (x[r][c] !== 0) {
                    digitsPresent.add(x[r][c]);
                    continue;
                }
                for (const candidate of ps[r][c]) {
                    rIndices[candidate - 1].push(r);
                }
            }
            for (let j = 0; j < 4; j++) {
                if (rIndices[j].length === 2 && !digitsPresent.has(j + 1)) {
                     if (!this.smartHint) {
                        x[rIndices[j][0]][c] = j + 1;
                        x[rIndices[j][1]][c] = j + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden twin in Column ${c + 1}. Digit ${j + 1} in R${rIndices[j][0] + 1}${rIndices[j][1] + 1}.`;
                    }
                    return true;
                }
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            const bIndices = Array.from({ length: 4 }, () => []);
            const digitsPresent = new Set();
            for (let j = 0; j < 8; j++) {
                 const r = rG(b, j);
                 const c = cG(b, j);
                if (x[r][c] !== 0) {
                    digitsPresent.add(x[r][c]);
                    continue;
                }
                for (const candidate of ps[r][c]) {
                    bIndices[candidate - 1].push(j);
                }
            }
            for (let k = 0; k < 4; k++) {
                if (bIndices[k].length === 2 && !digitsPresent.has(k + 1)) {
                     if (!this.smartHint) {
                         const idx1 = bIndices[k][0];
                         const idx2 = bIndices[k][1];
                        x[rG(b, idx1)][cG(b, idx1)] = k + 1;
                        x[rG(b, idx2)][cG(b, idx2)] = k + 1;
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Hidden twin in Block ${b + 1}. Digit ${k + 1} in P${bIndices[k][0] + 1}${bIndices[k][1] + 1}.`;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    nakedSingle(x, ps) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (x[r][c] !== 0) continue;
                if (ps[r][c].length === 1) {
                    if (!this.smartHint) {
                        x[r][c] = ps[r][c][0];
                        this.refreshCandidates(x, ps);
                    } else {
                        this.hintString = `Naked single at R${r + 1}C${c + 1}, digit ${ps[r][c][0]}.`;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    // --- Helper Functions for almostHiddenTwin and combinations ---
    generateCombinations(list, size) {
        const combinations = [];
        this.getCombinations(size, list, 0, [], combinations);
        return combinations;
    }

    getCombinations(n, list, start, currentComb, combinations) {
        if (n === 0) {
            combinations.push([...currentComb]); // Copy the current combination
            return;
        }
        for (let i = start; i < list.length; i++) {
            currentComb.push(list[i]);
            this.getCombinations(n - 1, list, i + 1, currentComb, combinations);
            currentComb.pop();
        }
    }

    isNeighbor(r1, c1, r2, c2) {
        return (r1 === r2 && Math.abs(c2 - c1) === 1) || (c1 === c2 && Math.abs(r2 - r1) === 1);
    }

    almostHiddenTwin(x, ps) {
         // Row
        for (let r = 0; r < 8; r++) {
            for (let n = 1; n <= 4; n++) {
                const indices = [];
                let containsN = false;
                for (let c = 0; c < 8; c++) {
                    if (x[r][c] === 0) {
                        if (ps[r][c].includes(n)) indices.push(c);
                    } else if (x[r][c] === n) {
                        containsN = true;
                        break;
                    }
                }
                if (containsN) continue;
                if (indices.length !== 3) continue;

                const myCombinations = this.generateCombinations(indices, 2);
                const validCombinations = [];
                for (const combination of myCombinations) {
                    if (!this.isNeighbor(r, combination[0], r, combination[1])) {
                        validCombinations.push(combination);
                    }
                }

                // Find intersection of all valid combinations
                if (validCombinations.length > 0) {
                    let intersection = new Set(validCombinations[0]);
                    for (let i = 1; i < validCombinations.length; i++) {
                        intersection = new Set([...intersection].filter(x => validCombinations[i].includes(x)));
                    }
                    intersection = [...intersection]; // Convert back to array

                    if (intersection.length > 0) {
                        if (!this.smartHint) {
                            for (const index of intersection) {
                                x[r][index] = n;
                            }
                            this.refreshCandidates(x, ps);
                        } else {
                            this.hintString = `Almost hidden twin in Row ${r + 1}. Digit ${n} placed in C${intersection.map(i => i + 1).join('')}.`;
                        }
                        return true;
                    }
                }
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
           for (let n = 1; n <= 4; n++) {
                const indices = [];
                let containsN = false;
                for (let r = 0; r < 8; r++) {
                    if (x[r][c] === 0) {
                        if (ps[r][c].includes(n)) indices.push(r);
                    } else if (x[r][c] === n) {
                        containsN = true;
                        break;
                    }
                }
                if (containsN) continue;
                if (indices.length !== 3) continue;

                const myCombinations = this.generateCombinations(indices, 2);
                const validCombinations = [];
                for (const combination of myCombinations) {
                    if (!this.isNeighbor(combination[0], c, combination[1], c)) {
                        validCombinations.push(combination);
                    }
                }

                // Find intersection of all valid combinations
                if (validCombinations.length > 0) {
                    let intersection = new Set(validCombinations[0]);
                    for (let i = 1; i < validCombinations.length; i++) {
                        intersection = new Set([...intersection].filter(x => validCombinations[i].includes(x)));
                    }
                    intersection = [...intersection]; // Convert back to array

                    if (intersection.length > 0) {
                        if (!this.smartHint) {
                            for (const index of intersection) {
                                x[index][c] = n;
                            }
                            this.refreshCandidates(x, ps);
                        } else {
                             this.hintString = `Almost hidden twin in Column ${c + 1}. Digit ${n} placed in R${intersection.map(i => i + 1).join('')}.`;
                        }
                        return true;
                    }
                }
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            for (let n = 1; n <= 4; n++) {
                const indices = [];
                let containsN = false;
                for (let j = 0; j < 8; j++) {
                     const r = rG(b, j);
                     const c = cG(b, j);
                    if (x[r][c] === 0) {
                        if (ps[r][c].includes(n)) indices.push(j);
                    } else if (x[r][c] === n) {
                        containsN = true;
                        break;
                    }
                }
                if (containsN) continue;
                if (indices.length !== 3) continue;

                const myCombinations = this.generateCombinations(indices, 2);
                const validCombinations = [];
                for (const combination of myCombinations) {
                    if (!this.isNeighbor(rG(b, combination[0]), cG(b, combination[0]), rG(b, combination[1]), cG(b, combination[1]))) {
                        validCombinations.push(combination);
                    }
                }

                // Find intersection of all valid combinations
                if (validCombinations.length > 0) {
                    let intersection = new Set(validCombinations[0]);
                    for (let i = 1; i < validCombinations.length; i++) {
                        intersection = new Set([...intersection].filter(x => validCombinations[i].includes(x)));
                    }
                    intersection = [...intersection]; // Convert back to array

                    if (intersection.length > 0) {
                        if (!this.smartHint) {
                            for (const index of intersection) {
                                 x[rG(b, index)][cG(b, index)] = n;
                            }
                            this.refreshCandidates(x, ps);
                        } else {
                             this.hintString = `Almost hidden twin in Block ${b + 1}. Digit ${n} placed in P${intersection.map(i => i + 1).join('')}.`;
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    }


    combinations(x, ps, size) {
        // Row
        for (let r = 0; r < 8; r++) {
            const indices = [];
            const existingDigitCount = new Array(4).fill(0);
            for (let c = 0; c < 8; c++) {
                if (x[r][c] === 0) {
                    indices.push(c);
                } else {
                    existingDigitCount[x[r][c] - 1]++;
                }
            }
            if (indices.length !== size) continue;

            const candies = indices.map(i => [...ps[r][i]]); // Deep copy candidates
            const validCombinations = this.checkValidCombinationsRow(indices, candies, existingDigitCount, r);

            // Calculate union for each cell index
            const union = Array(size).fill(null).map(() => new Set());
            for (const validCombination of validCombinations) {
                for (let i = 0; i < size; i++) {
                    union[i].add(validCombination[i]);
                }
            }

            const solution = new Array(size).fill(0);
            let solutionFound = false;
            for (let i = 0; i < size; i++) {
                if (union[i].size === 1) {
                    solutionFound = true;
                    solution[i] = [...union[i]][0]; // Get the single element
                }
            }

            if (solutionFound) {
                if (!this.smartHint) {
                    for (let i = 0; i < size; i++) {
                        if (solution[i] !== 0) x[r][indices[i]] = solution[i];
                    }
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Combinations of size ${size} in Row ${r + 1}. Indices: C${indices.map(i => i + 1).join('')}. Solution: ${solution}. Valid combinations: ${JSON.stringify(validCombinations)}.`;
                }
                return true;
            }
        }

        // Column
        for (let c = 0; c < 8; c++) {
            const indices = [];
            const existingDigitCount = new Array(4).fill(0);
            for (let r = 0; r < 8; r++) {
                if (x[r][c] === 0) {
                    indices.push(r);
                } else {
                    existingDigitCount[x[r][c] - 1]++;
                }
            }
            if (indices.length !== size) continue;

            const candies = indices.map(i => [...ps[i][c]]); // Deep copy candidates
            const validCombinations = this.checkValidCombinationsColumn(indices, candies, existingDigitCount, c);

            const union = Array(size).fill(null).map(() => new Set());
            for (const validCombination of validCombinations) {
                for (let i = 0; i < size; i++) {
                    union[i].add(validCombination[i]);
                }
            }

            const solution = new Array(size).fill(0);
            let solutionFound = false;
            for (let i = 0; i < size; i++) {
                if (union[i].size === 1) {
                    solutionFound = true;
                    solution[i] = [...union[i]][0];
                }
            }

            if (solutionFound) {
                if (!this.smartHint) {
                    for (let i = 0; i < size; i++) {
                        if (solution[i] !== 0) x[indices[i]][c] = solution[i];
                    }
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Combinations of size ${size} in Column ${c + 1}. Indices: R${indices.map(i => i + 1).join('')}. Solution: ${solution}. Valid combinations: ${JSON.stringify(validCombinations)}.`;
                }
                return true;
            }
        }

        // Block
        for (let b = 0; b < 8; b++) {
            const indices = [];
            const existingDigitCount = new Array(4).fill(0);
            for (let j = 0; j < 8; j++) {
                 const r = rG(b, j);
                 const c = cG(b, j);
                if (x[r][c] === 0) {
                    indices.push(j);
                } else {
                    existingDigitCount[x[r][c] - 1]++;
                }
            }
            if (indices.length !== size) continue;

            const candies = indices.map(i => [...ps[rG(b, i)][cG(b, i)]]); // Deep copy candidates
            const validCombinations = this.checkValidCombinationsBlock(indices, candies, existingDigitCount, b);

            const union = Array(size).fill(null).map(() => new Set());
            for (const validCombination of validCombinations) {
                for (let i = 0; i < size; i++) {
                    union[i].add(validCombination[i]);
                }
            }

            const solution = new Array(size).fill(0);
            let solutionFound = false;
            for (let i = 0; i < size; i++) {
                if (union[i].size === 1) {
                    solutionFound = true;
                    solution[i] = [...union[i]][0];
                }
            }

            if (solutionFound) {
                if (!this.smartHint) {
                    for (let i = 0; i < size; i++) {
                        if (solution[i] !== 0) x[rG(b, indices[i])][cG(b, indices[i])] = solution[i];
                    }
                    this.refreshCandidates(x, ps);
                } else {
                    this.hintString = `Combinations of size ${size} in Block ${b + 1}. Indices: P${indices.map(i => i + 1).join('')}. Solution: ${solution}. Valid combinations: ${JSON.stringify(validCombinations)}.`;
                }
                return true;
            }
        }
        return false;
    }

    checkValidCombinationsColumn(indices, candies, existingDigitCount, c) {
        const result = [];
        const possibilities = [];
        this.getAllPossibleCombinations(candies, possibilities, [], 0);

        for (const possibility of possibilities) {
            const edc = [...existingDigitCount]; // Copy
            for (const digit of possibility) {
                edc[digit - 1]++;
            }

            let ruleViolation = false;
            for (let n = 0; n < 4; n++) { // Check counts for digits 1-4
                if (edc[n] !== 2) {
                    ruleViolation = true;
                    break;
                }
            }
            if (ruleViolation) continue;

            // Check neighbor constraint
            outerLoopC: for (let i0 = 0; i0 < indices.length - 1; i0++) {
                for (let i1 = i0 + 1; i1 < indices.length; i1++) {
                    if (this.isNeighbor(indices[i0], c, indices[i1], c) && possibility[i0] === possibility[i1]) {
                        ruleViolation = true;
                        break outerLoopC; // Break outer loop if violation found
                    }
                }
            }
            if (!ruleViolation) result.push(possibility);
        }
        return result;
    }

    checkValidCombinationsRow(indices, candies, existingDigitCount, r) {
        const result = [];
        const possibilities = [];
        this.getAllPossibleCombinations(candies, possibilities, [], 0);

        for (const possibility of possibilities) {
            const edc = [...existingDigitCount]; // Copy
            for (const digit of possibility) {
                edc[digit - 1]++;
            }

            let ruleViolation = false;
            for (let n = 0; n < 4; n++) { // Check counts for digits 1-4
                if (edc[n] !== 2) {
                    ruleViolation = true;
                    break;
                }
            }
            if (ruleViolation) continue;

            // Check neighbor constraint
            outerLoopR: for (let i0 = 0; i0 < indices.length - 1; i0++) {
                for (let i1 = i0 + 1; i1 < indices.length; i1++) {
                    if (this.isNeighbor(r, indices[i0], r, indices[i1]) && possibility[i0] === possibility[i1]) {
                        ruleViolation = true;
                        break outerLoopR; // Break outer loop if violation found
                    }
                }
            }
            if (!ruleViolation) result.push(possibility);
        }
        return result;
    }

    checkValidCombinationsBlock(indices, candies, existingDigitCount, b) {
        const result = [];
        const possibilities = [];
        this.getAllPossibleCombinations(candies, possibilities, [], 0);

        for (const possibility of possibilities) {
            const edc = [...existingDigitCount]; // Copy
            for (const digit of possibility) {
                edc[digit - 1]++;
            }

            let ruleViolation = false;
            for (let n = 0; n < 4; n++) { // Check counts for digits 1-4
                if (edc[n] !== 2) {
                    ruleViolation = true;
                    break;
                }
            }
            if (ruleViolation) continue;

            // Check neighbor constraint
            outerLoopB: for (let i0 = 0; i0 < indices.length - 1; i0++) {
                for (let i1 = i0 + 1; i1 < indices.length; i1++) {
                    if (this.isNeighbor(rG(b, indices[i0]), cG(b, indices[i0]), rG(b, indices[i1]), cG(b, indices[i1])) && possibility[i0] === possibility[i1]) {
                        ruleViolation = true;
                        break outerLoopB; // Break outer loop if violation found
                    }
                }
            }
            if (!ruleViolation) result.push(possibility);
        }
        return result;
    }

    getAllPossibleCombinations(candies, possibilities, possibility, cellIdx) {
        if (cellIdx === candies.length) {
            possibilities.push([...possibility]); // Copy the current possibility
            return;
        }
        for (const n of candies[cellIdx]) {
            possibility.push(n);
            this.getAllPossibleCombinations(candies, possibilities, possibility, cellIdx + 1);
            possibility.pop();
        }
    }

    // --- Main Solving/Hinting Functions ---
    getStep(x, ps) {
        if (this.fullHouse(x, ps)) return true;
        if (this.lastTwin(x, ps)) return true;
        if (this.hiddenSingle(x, ps)) return true;
        if (this.hiddenTwin(x, ps)) return true;
        if (this.nakedSingle(x, ps)) return true;
        if (this.almostHiddenTwin(x, ps)) return true;
        for (let size = 3; size <= 6; size++) {
            if (this.combinations(x, ps, size)) return true;
        }
        return false;
    }

    solve(x, ps) {
        // Ensure smartHint is false for solving
        const originalSmartHint = this.smartHint;
        this.smartHint = false;
        let difficulty = Difficulty.EASY;

        while (true) {
            if (this.fullHouse(x, ps)) {
                continue;
            }
            if (this.lastTwin(x, ps)) {
                continue;
            }
            if (this.hiddenSingle(x, ps)) {
                continue;
            }
            if (this.hiddenTwin(x, ps)) {
                if (difficulty < Difficulty.MEDIUM) {
                    difficulty = Difficulty.MEDIUM;
                }
                continue;
            }
            if (this.nakedSingle(x, ps)) {
                if (difficulty < Difficulty.MEDIUM) {
                    difficulty = Difficulty.MEDIUM;
                }
                continue;
            }
            if (this.almostHiddenTwin(x, ps)) {
                if (difficulty < Difficulty.HARD) {
                    difficulty = Difficulty.HARD;
                }
                continue;
            }
            let combinationsFound = false;
            for (let size = 3; size <= 6; size++) {
                combinationsFound = this.combinations(x, ps, size);
                if (combinationsFound) break;
            }
            if (combinationsFound) {
                if (difficulty < Difficulty.HARD) {
                    difficulty = Difficulty.HARD;
                }
                continue;
            }
            break; // No technique found, exit loop
        }

        // Restore original smartHint value
        this.smartHint = originalSmartHint;

        // Check if puzzle is complete
        let isComplete = true;
        outerLoop: for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (x[r][c] === 0) {
                    isComplete = false;
                    break outerLoop;
                }
            }
        }

        return isComplete ? difficulty : Difficulty.UNFAIR;
    }
}

// Example usage (assuming x and ps are defined):
// const solver = new DuoDoKuTechniques();
// solver.smartHint = true; // For hints
// const stepFound = solver.getStep(board, candidates);
// console.log(solver.hintString);
//
// solver.smartHint = false; // For solving
// const finalDifficulty = solver.solve(board, candidates);
// console.log("Solved with difficulty:", finalDifficulty);
