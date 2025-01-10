document.addEventListener('DOMContentLoaded', () => {
  const homeDisplay = document.getElementById('home');
  const containerDisplay = document.getElementById('container');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const timeDisplay = document.getElementById('timeDisplay');
  const holes = document.querySelectorAll('.hole');
  const cursor = document.querySelector('.cursor');
  const startButton = document.getElementById('start');
  const timeSelect = document.getElementById('time');
  const leaderboardButton = document.getElementById('leaderboard');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const leaderboardNone = document.getElementById('leaderboard-none');
  const closeLeaderboardButton = document.getElementById('close-leaderboard');
  const leaderboardSelect = document.getElementById('leaderboard-select');

  let score = 0;
  let gameTime = 60;
  let gameInterval;
  let countdownInterval;
  const STORAGE_KEY = 'whackamoleLeaderboard';

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

  function run() {
    const i = Math.floor(Math.random() * holes.length);
    const hole = holes[i];
    let timer = null;

    const img = document.createElement('img');
    img.classList.add('mole');
    img.src = 'resource/mole.png';
    img.style.height = '200px';

    img.addEventListener('click', () => {
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
    });

    hole.appendChild(img);

    const randomTime = Math.random() * 1000 + 500; // 隨機時間間隔在500ms到1500ms之間
    timer = setTimeout(() => {
      if (hole.contains(img)) {
        hole.removeChild(img);
      }
      run();
    }, randomTime);
  }

  function startCountdown() {
    countdownInterval = setInterval(() => {
      gameTime--;
      timeDisplay.textContent = `時間: ${gameTime}`;
      if (gameTime <= 0) {
        clearInterval(countdownInterval);
        clearInterval(gameInterval);
        
        containerDisplay.style.display = 'none';
        homeDisplay.style.display = 'block';
    
        const playerName = prompt(`遊戲結束！你的分數是 ${score}！請輸入你的名字：`,'玩家');
        const time = timeSelect.value;
        
        leaderboard.save(playerName, score, time);
        if (leaderboardModal.style.display === 'block') {
          leaderboard.display(difficulty); // 即時更新排行榜顯示
        }
        showMessage('你的紀錄已儲存到排行榜！', 5000);
      }
    }, 1000);
  }
  // 初始化排行榜
  const leaderboard = {
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
    sanitizePlayerName(name) {
      return (name || '匿名')
        .slice(0, 30)
        .replace(/[<>]/g, '')
        .trim() || '匿名';
    },
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
  

  startButton.addEventListener('click', startGame);

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

  timeSelect.addEventListener('change', () => {
    leaderboardSelect.value = timeSelect.value;
    if (leaderboardModal.style.display === 'block') {
      leaderboard.display(timeSelect.value); // 即時更新排行榜顯示
    }
  });

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

    leaderboardModal.addEventListener('mouseup', function() {
      document.removeEventListener('mousemove', onMouseMove);
      leaderboardModal.onmouseup = null;
    });
  });

  leaderboardModal.ondragstart = function() {
    return false;
  };
});