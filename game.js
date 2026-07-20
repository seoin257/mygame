const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 상태 변수 ---
// phase: 1(초반-달리기), 2(중반-수식), 3(후반-드론비행), 4(후반-드론조작)
let phase = 1; 
let frame = 0; // 시간 흐름 체크용
let score = 0;
let isGameOver = false;

// --- 플레이어(동그라미) ---
const player = {
    x: 100,
    y: 300,
    radius: 20,
    vy: 0,
    gravity: 0.6,
    jumpPower: -12,
    isJumping: false,
    speed: 5 // 후반 드론 조작용 속도
};

// --- 장애물(네모) 배열 ---
let obstacles = [];

// --- 입력 감지 ---
const keys = {};
let currentAnswer = ""; // 수식 입력용

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // 점프 (초반, 중반용)
    if (e.code === 'Space' && (phase === 1 || phase === 2)) {
        if (!player.isJumping) {
            player.vy = player.jumpPower;
            player.isJumping = true;
        }
    }
    
    // 후반 드론 파괴용 스페이스바
    if (e.code === 'Space' && phase === 4) {
        destroyObstacleInFront();
    }

    // 중반 수식 입력 (숫자키)
    if (phase === 2 && e.key >= '0' && e.key <= '9') {
        checkMathAnswer(e.key);
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- 장애물 생성 함수 ---
function spawnObstacle(type, text, positionY, mathTarget = null) {
    obstacles.push({
        x: 800,
        y: positionY,
        w: 40,
        h: 40,
        type: type, // 'cola', 'balloon', 'math', 'error' 등
        text: text,
        mathTarget: mathTarget, // 수식 정답 (중반용)
        speed: 5
    });
}

// --- 중반: 수식 정답 체크 ---
function checkMathAnswer(numStr) {
    // 가장 앞에 있는 수학 장애물 찾기
    let target = obstacles.find(obs => obs.type === 'math');
    if (target && target.mathTarget == numStr) {
        // 정답이면 장애물 삭제
        obstacles = obstacles.filter(obs => obs !== target);
        console.log("정답! 자물쇠 파괴!");
    }
}

// --- 후반: 드론 장애물 파괴 ---
function destroyObstacleInFront() {
    // 플레이어와 x좌표가 비슷하고 살짝 앞에 있는 장애물 제거
    obstacles = obstacles.filter(obs => !(obs.x > player.x && obs.x < player.x + 100));
}

// --- 충돌 감지 (원과 사각형) ---
function checkCollision(circle, rect) {
    let distX = Math.abs(circle.x - rect.x - rect.w / 2);
    let distY = Math.abs(circle.y - rect.y - rect.h / 2);

    if (distX > (rect.w / 2 + circle.radius)) return false;
    if (distY > (rect.h / 2 + circle.radius)) return false;
    if (distX <= (rect.w / 2)) return true;
    if (distY <= (rect.h / 2)) return true;

    let dx = distX - rect.w / 2;
    let dy = distY - rect.h / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

// --- 메인 게임 루프 (업데이트) ---
function update() {
    if (isGameOver) return;
    frame++;

    // 1. 플레이어 물리 엔진
    if (phase === 1 || phase === 2) {
        // 중력 적용
        player.vy += player.gravity;
        player.y += player.vy;

        // 바닥 충돌
        if (player.y >= 350 - player.radius) {
            player.y = 350 - player.radius;
            player.vy = 0;
            player.isJumping = false;
        }
    } else if (phase === 4) {
        // 드론 조작 (WASD)
        if (keys['KeyW'] && player.y > player.radius) player.y -= player.speed;
        if (keys['KeyS'] && player.y < 400 - player.radius) player.y += player.speed;
        if (keys['KeyA'] && player.x > player.radius) player.x -= player.speed;
        if (keys['KeyD'] && player.x < 800 - player.radius) player.x += player.speed;
    }

    // 2. 씬(Phase)별 시나리오 연출 (타이밍 조절 구역)
    if (phase === 1) {
        // 60프레임(약 1초)마다 콜라 생성 (아래쪽)
        if (frame % 60 === 0 && frame < 500) {
            spawnObstacle('cola', '콜라', 310);
        }
        // 풍선(위쪽 장애물 - 점프하면 죽음)
        if (frame === 600 || frame === 720) {
            spawnObstacle('balloon', '풍선', 240); // 공중에 생성
        }
        
        // 1000 프레임이 지나면 2단계로 강제 이동
        if (frame > 1000) {
            phase = 2;
            frame = 0; // 프레임 초기화
        }
    } 
    else if (phase === 2) {
        // 중반: 수식 자물쇠 생성
        if (frame === 100) spawnObstacle('math', '2+3=?', 310, 5); // 정답 5
        if (frame === 300) spawnObstacle('math', '7-3=?', 310, 4); // 정답 4
        
        if (frame > 600) {
            phase = 4; // 테스트를 위해 바로 드론 조작으로 넘김
            frame = 0;
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
    // 화면 밖으로 나간 장애물 제거
    obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
}

// --- 그리기 로직 ---
function draw() {
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 중반 배경색 변경 (가상공간)
    if (phase === 2) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 바닥 그리기
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 350, 800, 50);

    // 플레이어(동그라미) 그리기
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    // 장애물(네모) 그리기
    for (let obs of obstacles) {
        ctx.fillStyle = obs.type === 'math' ? 'red' : 'green';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        // 글자 적기
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(obs.text, obs.x, obs.y + 25);
    }

    // 게임 오버 텍스트
    if (isGameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", 280, 200);
    }

    // 상태 표시 텍스트
    ctx.fillStyle = phase === 2 ? 'white' : 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase}`, 20, 30);
    if (phase === 4) ctx.fillText("WASD 이동, 스페이스로 파괴!", 20, 60);
}

// --- 게임 루프 실행 ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
