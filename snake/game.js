document.addEventListener('DOMContentLoaded', () => {
  /* DOM元素 */
  const homeDisplay = document.getElementById('home');
  const containerDisplay = document.getElementById('container');
  const gameBoard = document.getElementById('game');
  const scoreDisplay = document.getElementById('score');
  const timeDisplay = document.getElementById('time');
  const levelDisplay = document.getElementById('level');
  const difficultyButtons = document.querySelectorAll('a[data-action="play"]');
  const leaderboardButton = document.getElementById('leaderboard');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const leaderboardNone = document.getElementById('leaderboard-none');
  const closeLeaderboardButton = document.getElementById('close-leaderboard');
  const leaderboardSelect = document.getElementById('leaderboard-select');
  const helpButton = document.getElementById('help');
  const helpModal = document.getElementById('help-modal');
  const closeHelpButton = document.getElementById('close-help');

  /* 標題動態蛇 */
  const dynamicSnake1 = document.getElementById('dynamic_snake1');
  const dynamicSnake2 = document.getElementById('dynamic_snake2');
  const top = 0;
  const left = 0;
  const width = 560;
  const height = 150;
  // 定義兩條蛇的狀態
  let snakes = [
    { element: dynamicSnake1, position: 0, direction: 0, speed: 0.002 },
    { element: dynamicSnake2, position: 0.5, direction: 0, speed: 0.002 },
  ];

  function moveTitleSnakes() {
    snakes.forEach((snake) => {
      let { element, position, speed } = snake;

      // 更新位置
      if (position > 1) position -= 1;

      // 移動並計算蛇的位置與方向
      if (position < 0.25) {
        // 上邊界
        position += (speed/4);
        element.style.top = `${top}px`;
        element.style.left = `${left + width * (position / 0.25)}px`;
        snake.direction = 0;
      } else if (position < 0.5) {
        // 右邊界
        position += speed;
        element.style.top = `${top + height * ((position - 0.25) / 0.25)}px`;
        element.style.left = `${left + width}px`;
        snake.direction = 90;
      } else if (position < 0.75) {
        // 下邊界
        position += (speed/4);
        element.style.top = `${top + height}px`;
        element.style.left = `${left + width * (1 - (position - 0.5) / 0.25)}px`;
        snake.direction = 180;
      } else {
        // 左邊界
        position += speed;
        element.style.top = `${top + height * (1 - (position - 0.75) / 0.25)}px`;
        element.style.left = `${left}px`;
        snake.direction = 270;
      }

      // 更新蛇的位置和方向
      snake.position = position;
      element.style.transform = `rotate(${snake.direction}deg)`;
    });
    
    // 持續移動
    requestAnimationFrame(moveTitleSnakes);
  }
  // 開始移動
  moveTitleSnakes();

  /* 
  遊戲主體 
  */
  const STORAGE_KEY = 'snakeLeaderboard';
  const boardSize = 15;
  const initialSnake = [{ x: 6, y: 6 }];
  const initialDirection = { x: 1, y: 0 };
  let snake = [...initialSnake];
  let direction = { ...initialDirection };
  let food = generateFood();
  let currentLevel = 1;
  let score = 0;
  let time = 0;
  let gameInterval;
  let timeInterval;
  let speed = 200;

  /* 初始化排行榜 */
  const leaderboard = {
    // 載入排行榜
    load(level) {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        const leaderboard = data ? JSON.parse(data) : {};
        return Array.isArray(leaderboard[level]) ? leaderboard[level] : [];
      } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
      }
    },
    // 儲存排行榜
    save(playerName, score, level, time) {
      try {
        console.log('leaderboard save',level);
        const cleanName = this.sanitizePlayerName(playerName);
        const leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        if (!leaderboard[level]) {
          leaderboard[level] = [];
        }
        leaderboard[level].push({
          playerName: cleanName,
          score: Math.floor(score),
          time: time
        });
        leaderboard[level].sort((a, b) => b.score - a.score);
        leaderboard[level] = leaderboard[level].slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
      } catch (e) {
        console.error('Error saving to leaderboard:', e);
        showMessage('儲存排行榜時發生錯誤');
      }
    },
    // 匿名設定
    sanitizePlayerName(name) {
      return (name || '匿名')
        .slice(0, 30)
        .replace(/[<>]/g, '')
        .trim() || '匿名';
    },
    // 顯示排行榜
    display(level) {
      const entries = leaderboard.load(level);
      const list = document.getElementById('leaderboard-list');
      list.innerHTML = '';
      if (entries.length === 0) {
        leaderboardNone.style.display = 'block';
      } else {
        leaderboardNone.style.display = 'none';
        entries.forEach((entry, index) => {
          const item = document.createElement('li');
          item.textContent = `${index + 1}. ${entry.playerName} - 長度${entry.score} - ${entry.time}秒`;
          list.appendChild(item);
        });
      }
      leaderboardModal.style.display = 'block';
    }
  };

  /* 創建遊戲場地 */
  function createBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, 40px)`;
    gameBoard.style.gridTemplateRows = `repeat(${boardSize}, 40px)`;
    for (let i = 0; i < boardSize * boardSize; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      gameBoard.appendChild(cell);
    }
  }

  /* 繪製遊戲場地 */
  function draw() {
    // 清除單元格狀態
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.classList.remove('snake', 'snake-head', 'snake-body', 'food'); 
      cell.style.backgroundImage = '';
      cell.style.transform = '';
    });
    // 繪製蛇
    snake.forEach((segment, index) => {
      const cellIndex = segment.y * boardSize + segment.x;
      const cell = cells[cellIndex];
      const isHead = index === 0;
      const isTail = index === snake.length - 1;
      const isEvenLength = snake.length % 2 === 0;
      cell.classList.add('snake');

      // 不同節段的處理
      if (isHead) {
        cell.classList.add('snake-head');
        const Angle = getRotationAngle(direction);
        if (Angle !== 180) {
          cell.style.transform = `rotate(${Angle}deg)`;
        } else {
          cell.style.transform = 'scaleX(-1)';
        }
      } 
      else {
        cell.classList.add('snake-body');
      }
    });
  
    // 繪製食物
    const foodIndex = food.y * boardSize + food.x;
    const foodCell = cells[foodIndex];
    foodCell.classList.add('food');
  }

  /* 獲取旋轉角度 */
  function getRotationAngle(direction) {
    if (direction.x === 1 && direction.y === 0) return 0; // 右
    if (direction.x === 0 && direction.y === 1) return 90; // 下
    if (direction.x === -1 && direction.y === 0) return 180; // 左
    if (direction.x === 0 && direction.y === -1) return 270; // 上
    return 0;
  }


  /* 移動蛇 */
  function moveSnake() {
    // 獲取蛇頭位置
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };
    
    // 檢查蛇頭是否超出邊界或撞到自己
    if (
      head.x < 0 || head.x >= boardSize ||
      head.y < 0 || head.y >= boardSize ||
      snake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
      endGame();
      return;
    }

    snake.unshift(head);
    // 如果蛇頭吃到食物
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreDisplay.textContent = `長度: ${score}`;
      food = generateFood();
      clearInterval(gameInterval);
      speed = Math.max(50, speed - 10); // Increase speed
      gameInterval = setInterval(moveSnake, speed);
    } else {
      snake.pop();
    }
    // 繪製遊戲場地
    draw();
  }

  /* 生成食物 */
  function generateFood() {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }

  /* 處理方向改變 */
  function handleDirectionChange(event) {
    const { key } = event;
    if (key === 'ArrowUp' && direction.y === 0) {
      direction = { x: 0, y: -1 };
    } else if (key === 'ArrowDown' && direction.y === 0) {
      direction = { x: 0, y: 1 };
    } else if (key === 'ArrowLeft' && direction.x === 0) {
      direction = { x: -1, y: 0 };
    } else if (key === 'ArrowRight' && direction.x === 0) {
      direction = { x: 1, y: 0 };
    }
  }
  
  /* 開始遊戲 */
  function startGame(selectedLevel) {
    currentLevel = selectedLevel;
    homeDisplay.style.display = 'none';
    containerDisplay.style.display = 'block';
    snake = [...initialSnake];
    direction = { ...initialDirection };
    food = generateFood();
    score = 0;
    time = 0;
    scoreDisplay.textContent = `長度: ${score}`;
    timeDisplay.textContent = `時間: ${time}`;
    speed = 400 - (selectedLevel - 1) * 50; 
    levelDisplay.textContent = `難度: ${
      selectedLevel === 1 ? '簡單' : 
      selectedLevel === 2 ? '中等' : 
      selectedLevel === 3 ? '困難' : 
      '地獄'
    }`;

    draw();
    clearInterval(gameInterval);
    gameInterval = setInterval(moveSnake, speed);
    timeInterval = setInterval(() => {
      time += 1;
      timeDisplay.textContent = `時間: ${time}`;
  }, 1000);
  }

  /* 結束遊戲 */
  function endGame() {
    homeDisplay.style.display = 'block';
    containerDisplay.style.display = 'none';
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    const playerName = prompt(`遊戲結束！你的分數是 ${score}！請輸入你的名字：`,'玩家');
    
    leaderboard.save(playerName, score, currentLevel, time);
    if (leaderboardModal.style.display === 'block') {
      leaderboard.display(currentLevel);
    }
    showMessage('你的紀錄已儲存到排行榜！', 5000);
  }

  createBoard();
  draw();

  window.addEventListener('keydown', handleDirectionChange);

  /* 難度選擇 */
  difficultyButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const level = parseInt(button.getAttribute('data-level'));
      startGame(level);
    });
  });

  /* 按鈕點擊相關事件 */
  leaderboardButton.addEventListener('click', () => {
    const selectedLevel = parseInt(leaderboardSelect.value) || currentLevel;
    leaderboard.display(selectedLevel);
    leaderboardModal.style.display = 'block';
  });
  leaderboardSelect.addEventListener('change', () => {
    const selectedLevel = parseInt(leaderboardSelect.value) || currentLevel;
    leaderboard.display(selectedLevel);
  });
  closeLeaderboardButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
  });
  helpButton.addEventListener('click', () => {
    helpModal.style.display = 'block';
  });
  closeHelpButton.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });
  
  /* 幫助視窗拖曳 */
  helpModal.addEventListener('mousedown', function(e) {
    let offsetX = e.clientX - helpModal.offsetLeft;
    let offsetY = e.clientY - helpModal.offsetTop;

    function moveAt(pageX, pageY) {
      helpModal.style.left = `${pageX - offsetX}px`;
      helpModal.style.top = `${pageY - offsetY}px`;
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mouseup', onMouseUp);
  });

  helpModal.ondragstart = function() {
    return false;
  };

  /* 排行榜視窗拖曳 */
  leaderboardModal.addEventListener('mousedown', function(e) {
    let offsetX = e.clientX - leaderboardModal.offsetLeft;
    let offsetY = e.clientY - leaderboardModal.offsetTop;

    function moveAt(pageX, pageY) {
      leaderboardModal.style.left = `${pageX - offsetX}px`;
      leaderboardModal.style.top = `${pageY - offsetY}px`;
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mouseup', onMouseUp);
  });

  leaderboardModal.ondragstart = function() {
    return false;
  };
});