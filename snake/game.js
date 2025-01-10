document.addEventListener('DOMContentLoaded', () => {
  const homeDisplay = document.getElementById('home');
  const containerDisplay = document.getElementById('container');
  const gameBoard = document.getElementById('game');
  const scoreDisplay = document.getElementById('score');
  const timeDisplay = document.getElementById('time');
  const difficultyButtons = document.querySelectorAll('a[data-action="play"]');
  const leaderboardButton = document.getElementById('leaderboard');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const leaderboardNone = document.getElementById('leaderboard-none');
  const closeLeaderboardButton = document.getElementById('close-leaderboard');
  const leaderboardSelect = document.getElementById('leaderboard-select');

  const STORAGE_KEY = 'snakeLeaderboard';
  const boardSize = 12;
  const initialSnake = [{ x: 6, y: 6 }];
  const initialDirection = { x: 0, y: -1 };
  let snake = [...initialSnake];
  let direction = { ...initialDirection };
  let food = generateFood();
  let currentLevel = 1;
  let score = 0;
  let time = 0;
  let gameInterval;
  let timeInterval;
  let speed = 200;

  // 初始化排行榜
  const leaderboard = {
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
    sanitizePlayerName(name) {
      return (name || '匿名')
        .slice(0, 30)
        .replace(/[<>]/g, '')
        .trim() || '匿名';
    },
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

  function createBoard() {
    gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, 48px)`;
    gameBoard.style.gridTemplateRows = `repeat(${boardSize}, 48px)`;
    for (let i = 0; i < boardSize * boardSize; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      gameBoard.appendChild(cell);
    }
  }

  function draw() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => cell.classList.remove('snake', 'food'));

    snake.forEach(segment => {
      const index = segment.y * boardSize + segment.x;
      cells[index].classList.add('snake');
    });

    const foodIndex = food.y * boardSize + food.x;
    cells[foodIndex].classList.add('food');
  }

  function moveSnake() {
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    if (
      head.x < 0 || head.x >= boardSize ||
      head.y < 0 || head.y >= boardSize ||
      snake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
      endGame();
      return;
    }

    snake.unshift(head);

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

    draw();
  }

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
    speed = 400 - (selectedLevel - 1) * 50; // Adjust speed based on level
    draw();
    clearInterval(gameInterval);
    gameInterval = setInterval(moveSnake, speed);
    timeInterval = setInterval(() => {
      time += 1;
      timeDisplay.textContent = `時間: ${time}`;
  }, 1000);
  }

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

  difficultyButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const level = parseInt(button.getAttribute('data-level'));
      startGame(level);
    });
  });

  window.addEventListener('keydown', handleDirectionChange);

  createBoard();
  draw();
  
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
  
  // 使排行榜視窗可拖曳
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