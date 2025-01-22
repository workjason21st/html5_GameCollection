document.addEventListener('DOMContentLoaded', () => {
  /* DOM元素 */
  const homeDisplay = document.getElementById('home');
  const containerDisplay = document.getElementById('container');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const timeDisplay = document.getElementById('timeDisplay');
  const holes = document.querySelectorAll('.hole');
  const cursor = document.querySelector('.cursor');
  const startButton = document.getElementById('start');
  const timeSelect = document.getElementById('time');
  const messageBox = document.getElementById('message-box');
  const leaderboardButton = document.getElementById('leaderboard');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const leaderboardNone = document.getElementById('leaderboard-none');
  const closeLeaderboardButton = document.getElementById('close-leaderboard');
  const leaderboardSelect = document.getElementById('leaderboard-select');
  const helpButton = document.getElementById('help');
  const helpModal = document.getElementById('help-modal');
  const closeHelpButton = document.getElementById('close-help');

  /* 遊戲變數 */
  let score = 0;
  let gameTime = 60;
  let gameInterval;
  let countdownInterval;
  let isPaused = false;
  const STORAGE_KEY = 'whackamoleLeaderboard';
  const isMobile = window.innerWidth < 768;

  /* 遊戲開始 */
  function startGame() {
    containerDisplay.style.display = 'block';
    homeDisplay.style.display = 'none';
    score = 0;
    scoreDisplay.textContent = `分數: ${score}`;
    gameTime = parseInt(timeSelect.value);
    timeDisplay.textContent = `時間: ${gameTime}`;
    run();
    startCountdown();
  }

  /* 遊戲運行 */
  function run() {
    const i = Math.floor(Math.random() * holes.length);
    const hole = holes[i];
    let timer = null;

    /* 地鼠生成 */
    const img = document.createElement('img');
    img.classList.add('mole');
    img.src = 'resource/mole.png';
    img.style.height = '200px';

    /* 地鼠點擊 */
    img.addEventListener('click', () => {
      if (!isPaused) {
        score += 1;
        scoreDisplay.textContent = `分數: ${score}`;
        img.src = 'resource/mole3.png';
        img.style.height = '100px';
        img.style.top = '70px';
        clearTimeout(timer);
        setTimeout(() => {
          hole.removeChild(img);
          run();
        }, 500);
      }
    });

    hole.appendChild(img);

    /* 地鼠消失 */
    const randomTime = Math.random() * 1000 + 500;
    timer = setTimeout(() => {
      if (hole.contains(img)) {
        hole.removeChild(img);
      }
      if (!isPaused) {
        run();
      }
    }, randomTime);
  }

  /* 遊戲倒數 */
  function startCountdown() {
    countdownInterval = setInterval(() => {
      if (!isPaused) {
        gameTime--;
        timeDisplay.textContent = `時間: ${gameTime}`;
        /* 遊戲結束 */
        if (gameTime <= 0) {
          clearInterval(countdownInterval);
          clearInterval(gameInterval);
          
          containerDisplay.style.display = 'none';
          homeDisplay.style.display = 'block';
      
          const playerName = prompt(`遊戲結束！你的分數是 ${score}！請輸入你的名字：`,'玩家');
          const time = timeSelect.value;
          
          leaderboard.save(playerName, score, time);
          if (leaderboardModal.style.display === 'block') {
            leaderboard.display(difficulty);
          }
          showMessage('你的紀錄已儲存到排行榜！', 5000);
        }
      }
    }, 1000);
  }

  /* 暫停&繼續遊戲 */
  function togglePause() {
    if (!countdownInterval) return;
    
    if (isPaused) {
      // 繼續遊戲
      run();
      isPaused = false;
      showMessage('遊戲繼續', 1000);
    } else {
      // 暫停遊戲
      isPaused = true;
      if (isMobile) {
        showMessage('遊戲暫停中，長擊遊戲螢幕繼續', 0);
      }
      else {
        showMessage('遊戲暫停中，點擊滑鼠右鍵繼續', 0);
      }
    }
  }

  /* 初始化排行榜 */
  const leaderboard = {
    // 載入排行榜
    load(time) {
      try {
        console.log('leaderboard load',time);
        const data = localStorage.getItem(STORAGE_KEY);
        const leaderboard = data ? JSON.parse(data) : {};
        return leaderboard[time] || [];
      } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
      }
    },
    // 儲存排行榜
    save(playerName, score, time) {
      try {
        console.log('leaderboard save',time);
        const cleanName = this.sanitizePlayerName(playerName);
        const leaderboard = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        if (!leaderboard[time]) {
          leaderboard[time] = [];
        }
        leaderboard[time].push({
          playerName: cleanName,
          score: Math.floor(score)
        });
        leaderboard[time].sort((a, b) => a.score - b.score);
        leaderboard[time] = leaderboard[time].slice(0, 10);
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
    display(time) {
      const entries = leaderboard.load(time);
      const list = document.getElementById('leaderboard-list');
      list.innerHTML = '';
      if (entries.length === 0) {
        const item = document.createElement('li');
        leaderboardNone.style.display = 'block';
        list.appendChild(item);
      } else {
        leaderboardNone.style.display = 'none';
        entries.forEach((entry, index) => {
          const item = document.createElement('li');
          item.textContent = `${index + 1}. ${entry.playerName} - ${entry.score}s`;
          list.appendChild(item);
        });
      }
      leaderboardModal.style.display = 'block';
    }
  };
  
  /* 顯示訊息 */
  function showMessage(message, duration = 0) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    
    // 根據訊息長度和裝置調整位置
    const messageLength = message.length;
    if (isMobile) {
      messageBox.style.left = '1%';
    } else {
      messageBox.style.left = messageLength > 6 ? '0%' : '30%';
    }

    if (messageBox.hideTimeout) {
      clearTimeout(messageBox.hideTimeout);
    }
    if (duration > 0) {
      messageBox.hideTimeout = setTimeout(() => {
        messageBox.style.display = 'none';
      }, duration);
    }
  }

  /* 遊戲開始按鈕 */
  startButton.addEventListener('click', startGame);

  /* 排行榜按鈕 */
  leaderboardButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'block';
    leaderboard.display(leaderboardSelect.value);
  });
  leaderboardSelect.addEventListener('change', () => {
    leaderboard.display(leaderboardSelect.value);
  });
  closeLeaderboardButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
  });
  /* 幫助視窗 */
  helpButton.addEventListener('click', () => {
    helpModal.style.display = 'block';
  });
  closeHelpButton.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  /* 時間選擇 */
  timeSelect.addEventListener('change', () => {
    leaderboardSelect.value = timeSelect.value;
    if (leaderboardModal.style.display === 'block') {
      leaderboard.display(timeSelect.value); 
    }
  });

  /* 滑鼠樣式 */
  window.addEventListener('mousemove', e => {
    cursor.style.top = e.pageY + 'px';
    cursor.style.left = e.pageX + 'px';
  });
  window.addEventListener('mousedown', () => {
    cursor.classList.add('active');
  });
  window.addEventListener('mouseup', () => {
    cursor.classList.remove('active');
  });
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (countdownInterval) {
      togglePause();
    }
  });
  
  /* 手機版長擊繼續遊戲 */
  let touchStart = 0;
  document.addEventListener('touchstart', function(e) {
    touchStart = e.touches[0].clientX;
  }, false);

  document.addEventListener('touchend', function(e) {
    if (e.changedTouches[0].clientX === touchStart && isPaused) {
      togglePause();
    }
  }, false);

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

    leaderboardModal.addEventListener('mouseup', function() {
      document.removeEventListener('mousemove', onMouseMove);
      leaderboardModal.onmouseup = null;
    });
  });

  leaderboardModal.ondragstart = function() {
    return false;
  };
});