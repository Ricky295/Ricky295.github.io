<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sudoku Generator Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 20px;
    }
    
    .sudoku-container {
      margin: 20px 0;
    }
    
    .sudoku-table {
      border-collapse: collapse;
      border: 3px solid #333;
    }
    
    .sudoku-table td {
      width: 40px;
      height: 40px;
      text-align: center;
      padding: 0;
      position: relative;
    }
    
    /* Borders for 3x3 boxes */
    .sudoku-table tr:nth-child(3n) td {
      border-bottom: 2px solid #333;
    }
    
    .sudoku-table tr:last-child td {
      border-bottom: none;
    }
    
    .sudoku-table td:nth-child(3n) {
      border-right: 2px solid #333;
    }
    
    .sudoku-table td:last-child {
      border-right: none;
    }
    
    /* Cell borders */
    .sudoku-table td {
      border: 1px solid #ddd;
    }
    
    .cell-content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9f9f9;
      font-size: 20px;
      box-sizing: border-box;
    }
    
    .cell-content.given {
      font-weight: bold;
      background-color: #e6e6e6;
    }
    
    .cell-content.hint {
      color: #1e88e5;
      font-weight: bold;
    }
    
    .cell-content.incorrect {
      color: #e53935;
    }

    .cell-content.correct {
      color: #43a047;
    }
    
    .cell-content[contenteditable="true"] {
      cursor: text;
      outline: none;
    }
    
    .controls {
      margin: 20px 0;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    button {
      padding: 8px 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #45a049;
    }
    
    button.secondary {
      background-color: #2196F3;
    }
    
    button.secondary:hover {
      background-color: #1976D2;
    }
    
    button.check {
      background-color: #FF9800;
    }
    
    button.check:hover {
      background-color: #F57C00;
    }
    
    button.print {
      background-color: #9C27B0;
    }
    
    button.print:hover {
      background-color: #7B1FA2;
    }
    
    .difficulty-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .date-control {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    
    .info {
      margin-top: 20px;
      text-align: center;
    }

    .difficulty-label {
      display: inline-block;
      min-width: 80px;
      text-align: center;
    }
    
    .timer {
      font-size: 24px;
      margin: 10px 0;
    }
    
    @media print {
      .controls, .date-control, button, .difficulty-control {
        display: none !important;
      }
      
      body {
        margin: 0;
        padding: 20px;
      }
      
      .info {
        margin-top: 10px;
      }
      
      .sudoku-table {
        page-break-inside: avoid;
      }
      
      .timer {
        display: none;
      }
    }
  </style>
</head>
<body>
  <h1>Sudoku Generator</h1>
  
  <div class="controls">
    <div class="difficulty-control">
      <label for="difficulty">Difficulty: </label>
      <input type="range" id="difficulty" min="0" max="4" value="2" step="0.25" style="width: 150px;">
      <span id="difficulty-value" class="difficulty-label">2.00</span>
    </div>
    <button id="new-game">New Game</button>
    <button id="daily-puzzle">Today's Puzzle</button>
    <button id="show-solution">Show Solution</button>
  </div>

  <div class="date-control">
    <label for="custom-date">Custom Daily Puzzle: </label>
    <input type="date" id="custom-date">
    <button id="generate-custom-daily">Generate</button>
  </div>
  
  <div class="timer" id="timer">00:00</div>
  
  <div class="sudoku-container">
    <table class="sudoku-table" id="sudoku-table"></table>
  </div>
  
  <div class="controls">
    <button id="hint-btn" class="secondary">Get Hint</button>
    <button id="check-btn" class="check">Check Solution</button>
    <button id="print-btn" class="print">Print Puzzle</button>
  </div>
  
  <div class="info">
    <p id="givens-info">Givens: 0</p>
    <p id="puzzle-info">Random Puzzle</p>
  </div>
  
  <script src="NEWSudokuGenerator.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const tableElement = document.getElementById('sudoku-table');
      const difficultyInput = document.getElementById('difficulty');
      const difficultyValueElement = document.getElementById('difficulty-value');
      const newGameBtn = document.getElementById('new-game');
      const dailyPuzzleBtn = document.getElementById('daily-puzzle');
      const showSolutionBtn = document.getElementById('show-solution');
      const givensInfo = document.getElementById('givens-info');
      const puzzleInfo = document.getElementById('puzzle-info');
      const customDateInput = document.getElementById('custom-date');
      const generateCustomDailyBtn = document.getElementById('generate-custom-daily');
      const hintBtn = document.getElementById('hint-btn');
      const checkBtn = document.getElementById('check-btn');
      const printBtn = document.getElementById('print-btn');
      const timerElement = document.getElementById('timer');
      
      let generator = new NEWSudokuGenerator();
      let currentPuzzle = null;
      let currentSolution = null;
      let timerInterval = null;
      let seconds = 0;
      let hints = [];
      
      // Initialize date input with today's date
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      customDateInput.value = `${year}-${month}-${day}`;
      
      // Timer functions
      function startTimer() {
        // Reset timer if it's already running
        stopTimer();
        seconds = 0;
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
          seconds++;
          updateTimerDisplay();
        }, 1000);
      }
      
      function stopTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }
      
      function updateTimerDisplay() {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
      }
      
      // Update difficulty value display
      function updateDifficultyLabel() {
        const difficulty = parseFloat(difficultyInput.value);
        // Format the difficulty with 2 decimal places
        difficultyValueElement.textContent = `${difficulty.toFixed(2)}`;
      }
      
      // Create the table-based grid UI
      function createTableGrid() {
        tableElement.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
          const tr = document.createElement('tr');
          
          for (let col = 0; col < 9; col++) {
            const td = document.createElement('td');
            const cellContent = document.createElement('div');
            
            cellContent.className = 'cell-content';
            cellContent.dataset.row = row;
            cellContent.dataset.col = col;
            
            td.appendChild(cellContent);
            tr.appendChild(td);
          }
          
          tableElement.appendChild(tr);
        }
      }
      
      // Update the grid with puzzle values
      function updateGrid(puzzle) {
        const cells = tableElement.querySelectorAll('.cell-content');
        hints = []; // Reset hints
        
        let givensCount = 0;
        
        cells.forEach(cell => {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);
          const value = puzzle[row][col];
          
          // Remove any previous classes
          cell.classList.remove('given', 'hint', 'incorrect', 'correct');
          
          if (value !== 0) {
            // This is a given
            cell.textContent = value;
            cell.classList.add('given');
            cell.contentEditable = false;
            givensCount++;
          } else {
            // This is an empty cell for user input
            cell.textContent = '';
            cell.contentEditable = true;
            
            // Add event listener to validate input
            cell.addEventListener('input', (e) => {
              // Strip non-numeric characters
              let text = e.target.textContent.replace(/[^1-9]/g, '');
              
              // Ensure only one character
              if (text.length > 1) {
                text = text.charAt(text.length - 1);
              }
              
              // Update content
              e.target.textContent = text;
              
              // Remove any validation classes when user edits
              e.target.classList.remove('hint', 'incorrect', 'correct');
              
              // Position cursor at the end
              if (text) {
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStart(e.target.childNodes[0], 1);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            });
            
            // Prevent pasting multiple characters
            cell.addEventListener('paste', (e) => {
              e.preventDefault();
              const text = (e.clipboardData || window.clipboardData).getData('text');
              const validChar = text.replace(/[^1-9]/g, '').charAt(0);
              if (validChar) {
                document.execCommand('insertText', false, validChar);
              }
            });
          }
        });
        
        // Update givens count
        givensInfo.textContent = `Givens: ${givensCount}`;
      }
      
      // Generate new puzzle based on difficulty
      function generatePuzzle() {
        const difficulty = parseFloat(difficultyInput.value);
        const result = generator.createPuzzle(difficulty);
        currentPuzzle = result.puzzle;
        currentSolution = result.solution;
        
        puzzleInfo.textContent = `Random Puzzle`;
        updateGrid(currentPuzzle);
        startTimer();
      }
      
      // Generate today's daily puzzle
      function generateTodaysPuzzle() {
        const difficulty = parseFloat(difficultyInput.value);
        const result = generator.createDailyPuzzle(difficulty);
        currentPuzzle = result.puzzle;
        currentSolution = result.solution;
        
        const today = new Date();
        puzzleInfo.textContent = `Daily Puzzle for ${today.toLocaleDateString()}`;
        updateGrid(currentPuzzle);
        startTimer();
      }
      
      // Generate custom daily puzzle
      function generateCustomDailyPuzzle() {
        const difficulty = parseFloat(difficultyInput.value);
        const dateString = customDateInput.value;
        
        if (!dateString) {
          alert('Please select a date');
          return;
        }
        
        const dateParts = dateString.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        
        const result = generator.createDailyPuzzle(difficulty, year, month, day);
        currentPuzzle = result.puzzle;
        currentSolution = result.solution;
        
        const displayDate = new Date(year, month - 1, day);
        puzzleInfo.textContent = `Daily Puzzle for ${displayDate.toLocaleDateString()}`;
        updateGrid(currentPuzzle);
        startTimer();
      }
      
      // Show solution
      function showSolution() {
        if (currentSolution) {
          updateGrid(currentSolution);
          stopTimer();
        }
      }
      
      // Get a hint
      function getHint() {
        if (!currentPuzzle || !currentSolution) return;
        
        const cells = tableElement.querySelectorAll('.cell-content:not(.given)');
        const emptyCells = Array.from(cells).filter(cell => !cell.textContent.trim());
        
        if (emptyCells.length === 0) {
          alert('No empty cells to provide hints for!');
          return;
        }
        
        // Find cells not already in hints
        const availableCells = emptyCells.filter(cell => {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);
          return !hints.some(hint => hint.row === row && hint.col === col);
        });
        
        if (availableCells.length === 0) {
          // All empty cells already have hints, start over
          hints = [];
          getHint();
          return;
        }
        
        // Pick a random cell to hint
        const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
        const row = parseInt(randomCell.dataset.row);
        const col = parseInt(randomCell.dataset.col);
        
        // Record this hint
        hints.push({ row, col });
        
        // Show the hint
        randomCell.textContent = currentSolution[row][col];
        randomCell.classList.add('hint');
        randomCell.contentEditable = false;
      }
      
      // Check solution
      function checkSolution() {
        if (!currentPuzzle || !currentSolution) return;
        
        const cells = tableElement.querySelectorAll('.cell-content');
        let allCorrect = true;
        
        cells.forEach(cell => {
          const row = parseInt(cell.dataset.row);
          const col = parseInt(cell.dataset.col);
          
          // Skip given cells and hint cells
          if (cell.classList.contains('given') || cell.classList.contains('hint')) {
            return;
          }
          
          const userValue = parseInt(cell.textContent) || 0;
          const correctValue = currentSolution[row][col];
          
          if (userValue === 0) {
            // Empty cell
            allCorrect = false;
          } else if (userValue === correctValue) {
            // Correct value
            cell.classList.remove('incorrect');
            cell.classList.add('correct');
          } else {
            // Incorrect value
            cell.classList.remove('correct');
            cell.classList.add('incorrect');
            allCorrect = false;
          }
        });
        
        if (allCorrect) {
          stopTimer();
          setTimeout(() => {
            alert(`Congratulations! You solved the puzzle in ${timerElement.textContent}!`);
          }, 100);
        }
      }
      
      // Print puzzle
      function printPuzzle() {
        window.print();
      }
      
      // Set up event listeners
      difficultyInput.addEventListener('input', updateDifficultyLabel);
      newGameBtn.addEventListener('click', generatePuzzle);
      dailyPuzzleBtn.addEventListener('click', generateTodaysPuzzle);
      generateCustomDailyBtn.addEventListener('click', generateCustomDailyPuzzle);
      showSolutionBtn.addEventListener('click', showSolution);
      hintBtn.addEventListener('click', getHint);
      checkBtn.addEventListener('click', checkSolution);
      printBtn.addEventListener('click', printPuzzle);
      
      // Initialize
      updateDifficultyLabel();
      createTableGrid();
      generatePuzzle();
    });
  </script>
</body>
</html>
