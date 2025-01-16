/* 遊戲設定 */
const GAME_CONFIG = {
  easy: { size: 8, mines: 10, cellSize: 86 },
  medium: { size: 16, mines: 40, cellSize: 42 },
  hard: { size: 24, mines: 99, cellSize: 27.2 }
};

const STORAGE_KEY = 'minesweeperLeaderboard';
const MESSAGE_DURATION = 3000;
const MAX_PLAYER_NAME_LENGTH = 20;

document.addEventListener('DOMContentLoaded', () => {
  /* DOM 元素 */
  const elements = {
    container: document.getElementById('container'),
    game: document.getElementById('game'),
    difficultySelect: document.getElementById('difficulty'),
    resetButton: document.getElementById('reset'),
    flagsDisplay: document.getElementById('flags'),
    timerDisplay: document.getElementById('timer'),
    helpButton: document.getElementById('help'),
    helpModal: document.getElementById('help-modal'),
    messageBox: document.getElementById('message-box'),
    leaderboardButton: document.getElementById('leaderboard'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    leaderboardNone: document.getElementById('leaderboard-none'),
    closeLeaderboardButton: document.getElementById('close-leaderboard'),
    leaderboardSelect: document.getElementById('leaderboard-select'),
    rulesModal: document.getElementById('rules-modal'),
    startGameButton: document.getElementById('start-game')
  };

  /* 遊戲狀態 */
  const gameState = {
    board: [],
    flagsLeft: 0,
    timer: null,
    timeElapsed: 0,
    gameStarted: false,
    gameOver: false,
    firstClick: true
  };

  /* 方向陣列，用於檢查周圍格子 */
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],         [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const cheatKeys = new Set(['2', '4', '6', '8']);
  let pressedKeys = new Set();

  /* 初始化排行榜 */
  const leaderboard = {
    // 載入排行榜 
    load(difficulty) {
      try {
        console.log('leaderboard load',difficulty);
        const data = localStorage.getItem(STORAGE_KEY);
        const leaderboard = data ? JSON.parse(data) : {};
        return leaderboard[difficulty] || [];
      } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
      }
    },
    // 儲存排行榜 
    save(playerName, time, difficulty) {
      try {
        console.log('leaderboard save',difficulty);
        const cleanName = this.sanitizePlayerName(playerName);
        const leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (!leaderboard[difficulty]) {
          leaderboard[difficulty] = [];
        }
        
        leaderboard[difficulty].push({
          playerName: cleanName,
          time: Math.floor(time)
        });
        
        leaderboard[difficulty].sort((a, b) => a.time - b.time);
        leaderboard[difficulty] = leaderboard[difficulty].slice(0, 10);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
      } catch (e) {
        console.error('Error saving to leaderboard:', e);
        showMessage('儲存排行榜時發生錯誤');
      }
    },
    // 匿名設定
    sanitizePlayerName(name) {
      return (name || '匿名')
        .slice(0, MAX_PLAYER_NAME_LENGTH)
        .replace(/[<>]/g, '')
        .trim() || '匿名';
    },
    // 顯示排行榜
    display(difficulty) {
      const entries = leaderboard.load(difficulty);
      const list = document.getElementById('leaderboard-list');
      list.innerHTML = '';
      
      if (entries.length === 0) {
        const item = document.createElement('li');
        elements.leaderboardNone.style.display = 'block';
        list.appendChild(item);
      } else {
        elements.leaderboardNone.style.display = 'none';
        entries.forEach((entry, index) => {
          const item = document.createElement('li');
          item.textContent = `${index + 1}. ${entry.playerName} - ${entry.time}s`;
          list.appendChild(item);
        });
      }
      elements.leaderboardModal.style.display = 'block';
    },
    // 清理排行榜
    clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        showMessage('排行榜已清理');
        this.display();
      } catch (e) {
        console.error('Error clearing leaderboard:', e);
        showMessage('清理排行榜時發生錯誤');
      }
    }
  };

  /* 遊戲核心功能 */
  function initGame() {
    cleanupGame();
    // 遊戲設定
    const config = GAME_CONFIG[elements.difficultySelect.value];
    const { size, mines, cellSize } = config;
    // 遊戲狀態
    Object.assign(gameState, {
      flagsLeft: mines,
      timeElapsed: 0,
      gameStarted: false,
      gameOver: false,
      firstClick: true
    });
    
    updateDisplays();
    setupGameBoard(size, cellSize);
    gameState.board = generateBoard(size);
    renderBoard();
    elements.leaderboardSelect.value = elements.difficultySelect.value;
    adjustScale();
  }
  /* 清理遊戲 */
  function cleanupGame() {
    elements.messageBox.style.display = 'none';
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }
    elements.game.innerHTML = '';
  }
  /* 遊戲設定 */
  function setupGameBoard(size, cellSize) {
    elements.game.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    elements.game.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
  }
  /* 生成遊戲場地 */
  function generateBoard(size) {
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        mine: false,
        revealed: false,
        count: 0,
        flagged: false
      }))
    );
  }
  /* 放置地雷 */
  function placeMines(x, y) {
    const config = GAME_CONFIG[elements.difficultySelect.value];
    const { size, mines } = config;
    let placedMines = 0;
    
    // 確保第一次點擊的位置及其周圍不會有地雷 
    const safeZone = new Set();
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safeZone.add(`${nx},${ny}`);
      }
    });
    safeZone.add(`${x},${y}`);
    // 放置地雷
    while (placedMines < mines) {
      const mx = Math.floor(Math.random() * size);
      const my = Math.floor(Math.random() * size);
      // 確保地雷不會放置在已經放置過的地雷周圍 
      if (!gameState.board[mx][my].mine && !safeZone.has(`${mx},${my}`)) {
        gameState.board[mx][my].mine = true;
        placedMines++;
      }
    }

    // 計算每個格子周圍的地雷數
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (!gameState.board[i][j].mine) {
          gameState.board[i][j].count = countAdjacentMines(i, j);
        }
      }
    }
  }
  /* 計算每個格子周圍的地雷數 */
  function countAdjacentMines(x, y) {
    const config = GAME_CONFIG[elements.difficultySelect.value];
    return directions.reduce((count, [dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < config.size && ny >= 0 && ny < config.size) {
        return count + (gameState.board[nx][ny].mine ? 1 : 0);
      }
      return count;
    }, 0);
  }
  /* 渲染遊戲場地 */
  function renderBoard() {
    elements.game.innerHTML = '';
    const config = GAME_CONFIG[elements.difficultySelect.value];
    
    gameState.board.forEach((row, x) => {
      row.forEach((cell, y) => {
        const cellElement = createCellElement(cell, x, y);
        elements.game.appendChild(cellElement);
      });
    });
  }
  /* 創建遊戲格子 */
  function createCellElement(cell, x, y) {
    const element = document.createElement('div');
    element.classList.add('cell');
    
    if (cell.revealed) {
      element.classList.add('revealed');
      if (cell.mine) {
        element.classList.add('mine');
        element.textContent = '💣';
      } else if (cell.count > 0) {
        element.classList.add(`number-${cell.count}`);
        element.textContent = cell.count;
      }
    } else if (cell.flagged) {
      element.classList.add('flagged');
      element.textContent = '🚩';
    }

    element.addEventListener('click', () => handleCellClick(x, y));
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!gameState.gameOver) {
        toggleFlag(x, y);
      }
    });

    return element;
  }
  /* 點擊格子 */
  function handleCellClick(x, y) {
    if (gameState.gameOver) {
      showMessage('請點擊重置按鈕開始新的一局！');
      return;
    }

    const cell = gameState.board[x][y];
    if (cell.revealed || cell.flagged) return;

    if (gameState.firstClick) {
      handleFirstClick(x, y);
      return;
    }

    revealCell(x, y);
  }
  /* 第一次點擊 */
  function handleFirstClick(x, y) {
    placeMines(x, y);
    gameState.firstClick = false;
    gameState.gameStarted = true;
    startTimer();
    revealCell(x, y);
  }
  /* 揭露格子 */
  function revealCell(x, y) {
    const cell = gameState.board[x][y];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    if (cell.mine) {
      gameOver();
      return;
    }

    if (cell.count === 0) {
      revealAdjacentCells(x, y);
    }

    renderBoard();
    checkWinCondition();
  }
  /* 揭露周圍格子 */
  function revealAdjacentCells(x, y) {
    const config = GAME_CONFIG[elements.difficultySelect.value];
    
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < config.size && ny >= 0 && ny < config.size) {
        if (!gameState.board[nx][ny].revealed) {
          revealCell(nx, ny);
        }
      }
    });
  }
  /* 旗子 */
  function toggleFlag(x, y) {
    const cell = gameState.board[x][y];
    if (cell.revealed) return;

    if (cell.flagged) {
      cell.flagged = false;
      gameState.flagsLeft++;
    } else if (gameState.flagsLeft > 0) {
      cell.flagged = true;
      gameState.flagsLeft--;
    }

    updateDisplays();
    renderBoard();
  }
  /* 遊戲結束 */
  function gameOver() {
    revealAllMines();
    showMessage('遊戲結束！', 5000);
    stopTimer();
    gameState.gameOver = true;
  }
  /* 揭露所有地雷 */
  function revealAllMines() {
    gameState.board.forEach(row => {
      row.forEach(cell => {
        if (cell.mine) cell.revealed = true;
      });
    });
    renderBoard();
  }
  /* 檢查勝利條件 */
  function checkWinCondition() {
    const config = GAME_CONFIG[elements.difficultySelect.value];
    let revealedCount = 0;
    
    gameState.board.forEach(row => {
      row.forEach(cell => {
        if (cell.revealed) revealedCount++;
      });
    });

    if (revealedCount === config.size * config.size - config.mines) {
      handleWin();
    }
  }
  /* 勝利 */
  function handleWin() {
    stopTimer();
    revealAllMines();
    
    const playerName = prompt('恭喜！你贏了！請輸入你的名字：', '玩家');
    const difficulty = elements.difficultySelect.value;
    
    leaderboard.save(playerName, gameState.timeElapsed, difficulty);
    leaderboard.display(difficulty);
    showMessage('你的紀錄已儲存到排行榜！', 5000);
  }
  /* 計時器相關函數 */
  function startTimer() {
    if (gameState.timer) return;
    
    gameState.timer = setInterval(() => {
      gameState.timeElapsed++;
      updateDisplays();
    }, 1000);
  }
  /* 停止計時器 */
  function stopTimer() {
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }
  }
  /* 顯示更新函數 */
  function updateDisplays() {
    elements.timerDisplay.textContent = `⏳ ${gameState.timeElapsed}`;
    elements.flagsDisplay.textContent = `🚩 ${gameState.flagsLeft}`;
  }
  /* 顯示訊息 */
  function showMessage(message, duration = MESSAGE_DURATION) {
    elements.messageBox.textContent = message;
    elements.messageBox.style.display = 'block';
    
    if (elements.messageBox.hideTimeout) {
      clearTimeout(elements.messageBox.hideTimeout);
    }
    
    elements.messageBox.hideTimeout = setTimeout(() => {
      elements.messageBox.style.display = 'none';
    }, duration);
  }
  /* 調整遊戲板大小 */
  function adjustScale() {
    if (!elements.game.scrollWidth || !elements.game.scrollHeight) return;
    
    const scale = Math.min(
      elements.container.clientWidth / elements.game.scrollWidth,
      elements.container.clientHeight / elements.game.scrollHeight
    );
    elements.game.style.transform = `scale(${scale})`;
  }
  /* 使排行榜視窗可拖曳 */
  elements.leaderboardModal.addEventListener('mousedown', function(e) {
    let offsetX = e.clientX - elements.leaderboardModal.offsetLeft;
    let offsetY = e.clientY - elements.leaderboardModal.offsetTop;

    function moveAt(pageX, pageY) {
      elements.leaderboardModal.style.left = `${pageX - offsetX}px`;
      elements.leaderboardModal.style.top = `${pageY - offsetY}px`;
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    elements.leaderboardModal.addEventListener('mouseup', function() {
      document.removeEventListener('mousemove', onMouseMove);
      elements.leaderboardModal.onmouseup = null;
    });
  });

  elements.leaderboardModal.ondragstart = function() {
    return false;
  };

  /* 鍵盤事件觸發 */
  document.addEventListener('keydown', (e) => {
    pressedKeys.add(e.key);
    if (cheatKeys.size === pressedKeys.size && [...cheatKeys].every(key => pressedKeys.has(key))) {
      revealEmptyCells();
    }
  });

  document.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.key);
  });
  /* 揭露空格子 */
  function revealEmptyCells() {
    gameState.board.forEach((row, x) => {
      row.forEach((cell, y) => {
        if (!cell.mine && cell.count != 5 && !cell.revealed) {
          const cellElement = elements.game.children[x * gameState.board.length + y];
          cellElement.classList.add('revealed');
          cell.revealed = true;
        }
      });
    });
  }

  initGame();

  /* 按鈕相關點擊事件 */
  elements.startGameButton.addEventListener('click', () => {
    elements.rulesModal.style.display = 'none';
  });
  elements.leaderboardButton.addEventListener('click', () => {
    elements.leaderboardModal.style.display = 'block';
    leaderboard.display(elements.leaderboardSelect.value);
  });
  elements.leaderboardSelect.addEventListener('change', () => {
    leaderboard.display(elements.leaderboardSelect.value);
  });
  elements.closeLeaderboardButton.addEventListener('click', () => {
    elements.leaderboardModal.style.display = 'none';
  });
  // 選擇難度
  elements.difficultySelect.addEventListener('change', () => {
    initGame();
    elements.leaderboardSelect.value = elements.difficultySelect.value;
    if (elements.leaderboardModal.style.display === 'block') {
      leaderboard.display(elements.difficultySelect.value);
    }
  });
  elements.resetButton.addEventListener('click', initGame);
  elements.helpButton.addEventListener('mouseenter', () => {
    elements.helpModal.style.display = 'block';
  });
  elements.helpButton.addEventListener('mouseleave', () => {
    elements.helpModal.style.display = 'none';
  });
});