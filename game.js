const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 상태 변수 ---
let phase = 1; 
let subPhase = 0;
let spawnTimer = 0; 
let spawnCount = 0; 
let score = 0;
let isGameOver = false;

// 중반부 수식 입력용 변수
let playerInput = ""; 

// --- 플레이어 ---
const player = {
    x: 180,        
    y: 270,        
    w: 40,         
    h: 80,         
    vy: 0,
    gravity: 0.6,
    jumpPower: -11.2, 
    isJumping: false,
};

// --- 장애물 배열 및 배경 캐릭터 ---
let obstacles = [];
let backgroundCharacter = null; 

// --- 입력 감지 ---
window.addEventListener('keydown', (e) => {
    // 점프
    if (e.code === 'Space' && !player.isJumping) {
        player.vy = player.jumpPower;
        player.isJumping = true;
    }

    // 중반부(Phase 2) 숫자 타이핑 로직
    if (phase === 2 && e.key >= '0' && e.key <= '9') {
        playerInput += e.key;
        
        // 화면에 있는 자물쇠 중 가장 앞에 있는 것 찾기
        let target = obstacles.find(obs => obs.type === 'lock');
        
        if (target) {
            // 정답이 완벽히 일치하면 자물쇠 파괴!
            if (target.mathAns === playerInput) {
                obstacles = obstacles.filter(obs => obs !== target);
                playerInput = ""; // 입력 초기화
            } 
            // 누른 숫자가 정답의 앞부분과 다르면 (오타를 내면) 리셋
            else if (!target.mathAns.startsWith(playerInput)) {
                playerInput = e.key; 
            }
        }
    }
    
    // 백스페이스키로 입력 지우기
    if (phase === 2 && e.key === 'Backspace') {
        playerInput = playerInput.slice(0, -1);
    }
});

// --- 장애물 생성 함수 (너비, 높이 파라미터 추가) ---
function spawnObstacle(type, text, positionY, speed = 5, startX = 800, w = 50, h = 40) {
    obstacles.push({
        x: startX,
        y: positionY,
        w: w, 
        h: h, 
        type: type, 
        text: text,
        speed: speed
    });
}

// --- 직사각형 충돌 감지 로직 ---
function checkCollision(p, obs) {
    return (
        p.x < obs.x + obs.w &&
        p.x + p.w > obs.x &&
        p.y < obs.y + obs.h &&
        p.y + p.h > obs.y
    );
}

// --- 메인 게임 루프 ---
function update() {
    if (isGameOver) return;

    // 1. 플레이어 물리 엔진
    player.vy += player.gravity;
    player.y += player.vy;

    if (player.y >= 350 - player.h) {
        player.y = 350 - player.h;
        player.vy = 0;
        player.isJumping = false;
    }

    // 2. 시나리오 엔진 (Phase 1: 초반 / Phase 2: 중반)
    if (phase === 1) {
        spawnTimer++;

        if (subPhase === 0) { // 콜라 7개
            if (spawnTimer >= 70) { 
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                if (spawnCount >= 7) { subPhase = 1; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 1) { // A 등장 및 공격 3번
            if (spawnTimer === 1 && spawnCount === 0) {
                backgroundCharacter = { text: 'A', x: player.x - 70, y: 270, warning: false };
            }
            
            let cycle = spawnTimer % 120;
            if (cycle === 60) {
                if (backgroundCharacter) backgroundCharacter.warning = true;
            }
            if (spawnTimer > 0 && cycle === 0) {
                if (backgroundCharacter) backgroundCharacter.warning = false;
                spawnObstacle('attack', '국자', 310, -7, backgroundCharacter.x + 40);
                spawnCount++;
                
                if (spawnCount >= 3) { subPhase = 2; spawnCount = 0; spawnTimer = -30; }
            }
        }
        else if (subPhase === 2) { // 바퀴벌레
            if (spawnTimer === 1) spawnObstacle('roach', '바퀴벌레', 310, 7);
            
            let isRoachAlive = obstacles.find(obs => obs.type === 'roach');
            if (spawnTimer > 10 && !isRoachAlive) {
                backgroundCharacter = null; 
                subPhase = 3; spawnTimer = 0;
            }
        }
        else if (subPhase === 3) { // 콜라 5번
            if (spawnTimer >= 70) {
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                if (spawnCount >= 5) { subPhase = 4; spawnCount = 0; spawnTimer = -30; }
            }
        }
        else if (subPhase === 4) { // B 등장 풍선 5개
            if (spawnTimer === 0) backgroundCharacter = { text: 'B', x: 700, y: 270 }; 
            
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('balloon', '풍선', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 5; spawnCount = 0; spawnTimer = -80; }
            }
        }
        else if (subPhase === 5) { // C 등장 음표 5개
            if (spawnTimer === 0) backgroundCharacter = { text: 'C', x: 700, y: 270 }; 
            
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('note', '음표', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 6; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 6) { // 중반부(가상공간) 진입 준비
            if (obstacles.length === 0) {
                backgroundCharacter = null; 
                phase = 2; 
                subPhase = 0;
                spawnTimer = -30; // 전환 대기 시간
                console.log("중반부(가상공간) 시작!");
            }
        }
    }
    // ----------------------------------------------------------------
    // 🖥️ Phase 2: 중반부 (가상공간)
    // ----------------------------------------------------------------
    else if (phase === 2) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 무작위 높이에서 엄청 빠르게 날아오는 에러 아이콘 7개
            if (spawnTimer > 0 && spawnTimer % 30 === 0) {
                // 200 ~ 320 사이의 랜덤한 높이 생성
                let randomY = Math.floor(Math.random() * 120) + 200;
                
                // 크기는 작고(30x30) 속도는 무지하게 빠름(11)
                spawnObstacle('error', 'ERR', randomY, 11, 800, 30, 30);
                spawnCount++;

                if (spawnCount >= 7) {
                    subPhase = 1;
                    spawnCount = 0;
                    spawnTimer = -60; // 자물쇠 나오기 전 긴장감 조성 대기
                }
            }
        }
        else if (subPhase === 1) {
            // [1단계] 점프불가 수식 자물쇠 5개 (좁은 간격, 천천히)
            if (spawnTimer > 0 && spawnTimer % 90 === 0) {
                // 팩토리얼이 포함된 5개의 수식 라인업
                let equations = [
                    { q: '3! = ?', a: '6' },
                    { q: '2^4 = ?', a: '16' },
                    { q: '5! / 24 = ?', a: '5' },
                    { q: '4! - 11 = ?', a: '13' },
                    { q: '2^5 = ?', a: '32' }
                ];
                let eq = equations[spawnCount];
                
                // 자물쇠는 화면을 꽉 채우는 크기 (높이 300)로 설정해 점프 불가
                // 속도는 2.5로 천천히 다가옴
                obstacles.push({
                    x: 800, y: 50, w: 70, h: 300, type: 'lock', text: eq.q, mathAns: eq.a, speed: 2.5
                });
                
                spawnCount++;

                if (spawnCount >= 5) {
                    subPhase = 2;
                    spawnCount = 0;
                    spawnTimer = -150; // 마지막 자물쇠 부술 시간 확보
                }
            }
        }
        else if (subPhase === 2) {
            // [2단계] 해커J 메시지
            if (spawnTimer === 0) {
                // 머리 위(Y: 60)를 스쳐지나가는 얇고 긴 텍스트 (충돌박스 높이 20)
                spawnObstacle('hacker', '해커J왔다감 /(^3^)/', 60, 7, 800, 250, 20);
            }

            if (spawnTimer > 100 && obstacles.length === 0) {
                phase = 3; 
                subPhase = 0;
                spawnTimer = 0;
                console.log("후반부 시작!");
            }
        }
    }

    // 3. 장애물 이동 및 충돌 체크
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed; 

        if (checkCollision(player, obs)) {
            isGameOver = true;
        }
    }
    
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 1000);
}

// --- 그리기 로직 ---
function draw() {
    // 배경 테마 전환
    if (phase === 1) {
        ctx.fillStyle = '#ffffff'; // 초반부 하얀 배경
    } else {
        ctx.fillStyle = '#0a0a1a'; // 중반부 가상공간 어두운 네이비 배경
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 바닥 테마 전환
    ctx.fillStyle = (phase === 1) ? '#333' : '#00ffff'; // 가상공간은 형광 바닥
    ctx.fillRect(0, 350, 800, 50);

    // 플레이어
    ctx.fillStyle = (phase === 1) ? 'blue' : '#00ffff'; // 가상공간 형광 캐릭터
    ctx.fillRect(player.x, player.y, player.w, player.h);
    
    // 배경 캐릭터 (초반부)
    if (backgroundCharacter) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(backgroundCharacter.x, backgroundCharacter.y, 40, 80);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(backgroundCharacter.text, backgroundCharacter.x + 12, backgroundCharacter.y + 45);

        if (backgroundCharacter.warning) {
            ctx.fillStyle = 'red';
            ctx.font = 'bold 40px Arial';
            ctx.fillText('!', backgroundCharacter.x + 15, backgroundCharacter.y - 15);
        }
    }

    // 장애물 렌더링
    for (let obs of obstacles) {
        if (obs.type === 'attack') ctx.fillStyle = 'red';
        else if (obs.type === 'roach') ctx.fillStyle = 'saddlebrown';
        else if (obs.type === 'error') ctx.fillStyle = 'red';
        else if (obs.type === 'lock') ctx.fillStyle = '#555'; // 자물쇠는 회색
        else if (obs.type === 'hacker') ctx.fillStyle = 'transparent'; // 해커 메시지는 배경 투명
        else ctx.fillStyle = 'green';

        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        // 글씨색 설정
        if (obs.type === 'hacker') ctx.fillStyle = '#00ff00'; // 해커는 초록 글씨
        else if (obs.type === 'lock') ctx.fillStyle = 'gold'; // 자물쇠 수식은 금색
        else ctx.fillStyle = 'white';
        
        // 장애물 종류별 텍스트 위치 보정
        ctx.font = (obs.type === 'lock') ? 'bold 20px Arial' : '16px Arial';
        
        if (obs.type === 'lock') {
            // 자물쇠는 거대하므로 수식을 한가운데에 배치
            ctx.fillText(obs.text, obs.x + 5, obs.y + obs.h / 2);
        } else if (obs.type === 'error') {
            ctx.fillText(obs.text, obs.x - 2, obs.y + 20);
        } else {
            ctx.fillText(obs.text, obs.x + 5, obs.y + 25);
        }
    }

    // 상태 표시
    ctx.fillStyle = (phase === 1) ? 'black' : 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

    // 중반부(가상공간) 수식 자물쇠 입력 UI 표시
    if (phase === 2 && subPhase === 1) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`입력 중: [ ${playerInput} ]`, 330, 80);
    }

    // 게임 오버
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", 280, 200);
        ctx.font = '20px Arial';
        ctx.fillText("F5를 눌러 재시작하세요.", 290, 240);
    }
}

function gameLoop() {
    update();
    draw();
    if(!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
