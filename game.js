const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 상태 변수 ---
let phase = 1; 
let subPhase = 0;
let spawnTimer = 0; 
let spawnCount = 0; 
let score = 0;
let isGameOver = false;

// --- 플레이어 (사람 비율의 직사각형) ---
const player = {
    x: 250,        // 너무 왼쪽이 아니도록 오른쪽으로 이동
    y: 270,        // 바닥(350) - 키(80)
    w: 40,         // 너비
    h: 80,         // 키 두 배로 증가
    vy: 0,
    gravity: 0.6,
    jumpPower: -10.5, // 메뚜기 탈출 (점프력 약간 감소)
    isJumping: false,
};

// --- 장애물 배열 및 배경 캐릭터 ---
let obstacles = [];
let backgroundCharacter = null; 

// --- 입력 감지 ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !player.isJumping) {
        player.vy = player.jumpPower;
        player.isJumping = true;
    }
});

// --- 장애물 생성 함수 ---
// speed가 양수면 ← 방향 이동, 음수면 → 방향 이동
function spawnObstacle(type, text, positionY, speed = 5, startX = 800) {
    obstacles.push({
        x: startX,
        y: positionY,
        w: 50, 
        h: 40, 
        type: type, 
        text: text,
        speed: speed
    });
}

// --- 직사각형 충돌 감지 로직 (네모 vs 네모) ---
function checkCollision(p, obs) {
    // 겹치지 않는 조건을 모두 뚫고 지나가면 충돌한 것
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

    // 바닥 충돌 (Y 좌표 350이 바닥)
    if (player.y >= 350 - player.h) {
        player.y = 350 - player.h;
        player.vy = 0;
        player.isJumping = false;
    }

    // 2. 초반부 시나리오 엔진
    if (phase === 1) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 콜라 7개
            if (spawnTimer >= 70) { 
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                
                if (spawnCount >= 7) {
                    subPhase = 1;
                    spawnCount = 0;
                    spawnTimer = -30;
                }
            }
        }
        else if (subPhase === 1) {
            // [1단계] 뒤에서 A 등장, 국자 공격 3번
            if (spawnTimer === 0) {
                // A 캐릭터 등장 (플레이어 바로 뒤에 똑같은 크기로 딱 붙음)
                backgroundCharacter = { text: 'A', x: player.x - 70, y: 270 };
            }
            if (spawnTimer > 0 && spawnTimer % 90 === 0) {
                // 뒤에서 날아오는 국자! (A의 위치에서 생성되어 오른쪽으로 날아감)
                spawnObstacle('attack', '국자', 310, -7, backgroundCharacter.x + 40);
                spawnCount++;
                
                if (spawnCount >= 3) {
                    subPhase = 2;
                    spawnCount = 0;
                    spawnTimer = -30;
                }
            }
        }
        else if (subPhase === 2) {
            // [2단계] 앞에서 바퀴벌레 등장, 피하면 A 사라짐
            if (spawnTimer === 1) {
                spawnObstacle('roach', '바퀴벌레', 310, 7);
            }
            
            let isRoachAlive = obstacles.find(obs => obs.type === 'roach');
            if (spawnTimer > 10 && !isRoachAlive) {
                backgroundCharacter = null; 
                subPhase = 3;
                spawnTimer = 0;
            }
        }
        else if (subPhase === 3) {
            // [3단계] 다시 콜라 5번
            if (spawnTimer >= 70) {
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                
                if (spawnCount >= 5) {
                    subPhase = 4;
                    spawnCount = 0;
                    spawnTimer = -30;
                }
            }
        }
        else if (subPhase === 4) {
            // [4단계] B 등장, 풍선 위아래 5개
            if (spawnTimer === 0) {
                backgroundCharacter = { text: 'B', x: 700, y: 270 }; 
            }
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                let isUp = (spawnCount % 2 === 0);
                // 점프력이 줄었으므로 공중 장애물 위치도 약간 내림 (240 -> 250)
                let posY = isUp ? 250 : 310; 
                
                spawnObstacle('balloon', '풍선', posY, 5);
                spawnCount++;
                
                if (spawnCount >= 5) {
                    subPhase = 5;
                    spawnCount = 0;
                    spawnTimer = -80;
                }
            }
        }
        else if (subPhase === 5) {
            // [5단계] C 등장, 음표 위아래 5개
            if (spawnTimer === 0) {
                backgroundCharacter = { text: 'C', x: 700, y: 270 }; 
            }
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                let isUp = (spawnCount % 2 === 0);
                let posY = isUp ? 250 : 310;
                
                spawnObstacle('note', '음표', posY, 5);
                spawnCount++;
                
                if (spawnCount >= 5) {
                    subPhase = 6;
                    spawnCount = 0;
                    spawnTimer = 0;
                }
            }
        }
        else if (subPhase === 6) {
            if (obstacles.length === 0) {
                backgroundCharacter = null; 
                phase = 2; // 중반부로!
                console.log("중반부 시작!");
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
    
    // 국자가 오른쪽 끝으로 날아가는 것도 삭제하도록 범위를 넓게 줍니다.
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 1000);
}

// --- 그리기 로직 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 바닥
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 350, 800, 50);

    // 플레이어 (사람 몸통)
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    
    // 배경 캐릭터 (A, B, C) - 플레이어와 동일한 크기
    if (backgroundCharacter) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(backgroundCharacter.x, backgroundCharacter.y, 40, 80);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(backgroundCharacter.text, backgroundCharacter.x + 12, backgroundCharacter.y + 45);
    }

    // 장애물 (네모 + 단어)
    for (let obs of obstacles) {
        if(obs.type === 'attack') ctx.fillStyle = 'red';
        else if(obs.type === 'roach') ctx.fillStyle = 'saddlebrown';
        else ctx.fillStyle = 'green';

        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(obs.text, obs.x + 5, obs.y + 25);
    }

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

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
