const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 상태 변수 ---
let phase = 1; 
let subPhase = 0; // 초반부(Phase 1) 안에서의 세부 시나리오 순서
let spawnTimer = 0; // 장애물 등장 타이머
let spawnCount = 0; // 몇 개나 나왔는지 세는 카운터
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
};

// --- 장애물(네모) 배열 ---
let obstacles = [];

// --- 배경에 띄울 다른 캐릭터(A, B, C) ---
let backgroundCharacter = null; 

// --- 입력 감지 ---
window.addEventListener('keydown', (e) => {
    // 스페이스바를 누르면 점프 (공중에 없을 때만)
    if (e.code === 'Space' && !player.isJumping) {
        player.vy = player.jumpPower;
        player.isJumping = true;
    }
});

// --- 장애물 생성 함수 ---
// startX를 지정하지 않으면 화면 오른쪽 끝(800)에서 등장, speed가 음수면 왼쪽에서 오른쪽으로 이동
function spawnObstacle(type, text, positionY, speed = 5, startX = 800) {
    obstacles.push({
        x: startX,
        y: positionY,
        w: 50, // 네모 너비
        h: 40, // 네모 높이
        type: type, 
        text: text,
        speed: speed
    });
}

// --- 충돌 감지 로직 ---
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

    // 1. 플레이어 점프 및 중력 물리
    player.vy += player.gravity;
    player.y += player.vy;

    // 바닥 충돌 판정 (Y 좌표 350이 바닥)
    if (player.y >= 350 - player.radius) {
        player.y = 350 - player.radius;
        player.vy = 0;
        player.isJumping = false;
    }

    // 2. 초반부(Phase 1) 시나리오 엔진
    if (phase === 1) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 콜라 7개 넘기
            if (spawnTimer >= 70) { // 70프레임마다 하나씩
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                
                if (spawnCount >= 7) {
                    subPhase = 1; // 7개 다 나오면 다음 단계로
                    spawnCount = 0;
                    spawnTimer = -30; // 약간 대기시간
                }
            }
        }
        else if (subPhase === 1) {
            // [1단계] 뒤에서 A 등장, 공격 3번
            if (spawnTimer === 0) {
                // A 캐릭터 등장 (x위치 20, y위치 250)
                backgroundCharacter = { text: 'A', x: 20, y: 250 };
            }
            if (spawnTimer > 0 && spawnTimer % 90 === 0) {
                // 뒤에서 날아오는 공격! (시작 X: 20, 속도 -6으로 설정하여 왼쪽에서 오른쪽으로)
                spawnObstacle('attack', '공격', 310, -6, 20);
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
                spawnObstacle('roach', '바퀴벌레', 310, 7); // 속도 7로 좀 빠르게
            }
            
            // 화면에 바퀴벌레가 더 이상 없으면 (피해서 화면 밖으로 나갔으면)
            let isRoachAlive = obstacles.find(obs => obs.type === 'roach');
            if (spawnTimer > 10 && !isRoachAlive) {
                backgroundCharacter = null; // A 캐릭터 사라짐
                subPhase = 3;
                spawnTimer = 0;
            }
        }
        else if (subPhase === 3) {
            // [3단계] 다시 콜라 5번 넘기
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
            // [4단계] B 등장, 풍선 위아래로 5개
            if (spawnTimer === 0) {
                backgroundCharacter = { text: 'B', x: 700, y: 150 }; // B는 오른쪽 위에 띄움
            }
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                // 짝수면 위(240), 홀수면 아래(310)
                let isUp = (spawnCount % 2 === 0);
                let posY = isUp ? 240 : 310;
                
                spawnObstacle('balloon', '풍선', posY, 5);
                spawnCount++;
                
                if (spawnCount >= 5) {
                    subPhase = 5;
                    spawnCount = 0;
                    spawnTimer = -80; // 풍선 다 지나갈 때까지 대기
                }
            }
        }
        else if (subPhase === 5) {
            // [5단계] C 등장, 음표 위아래로 5개
            if (spawnTimer === 0) {
                backgroundCharacter = { text: 'C', x: 700, y: 150 }; // B가 C로 바뀜
            }
            if (spawnTimer > 0 && spawnTimer % 80 === 0) {
                let isUp = (spawnCount % 2 === 0);
                let posY = isUp ? 240 : 310;
                
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
            // 화면에 장애물이 하나도 남지 않으면 중반부로 넘어감
            if (obstacles.length === 0) {
                backgroundCharacter = null; // C 퇴장
                phase = 2; // 다음 중반부(가상공간)로!
                console.log("중반부 시작!");
            }
        }
    }
    // ----------------------------------------------------
    // 나중에 여기에 Phase 2 (중반부), Phase 3 (후반부)를 이어붙이시면 됩니다.
    // ----------------------------------------------------


    // 3. 장애물 이동 및 충돌 체크
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed; // speed가 음수면 x가 증가(왼쪽->오른쪽 이동)

        if (checkCollision(player, obs)) {
            isGameOver = true;
        }
    }
    
    // 화면 밖으로 완전히 나간 장애물 삭제 메모리 관리 (왼쪽 끝 -100 또는 오른쪽 끝 900)
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 900);
}

// --- 그리기 로직 (화면 표시) ---
function draw() {
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 바닥 그리기
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 350, 800, 50);

    // 플레이어 그리기 (동그라미)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();
    
    // 배경 캐릭터 (A, B, C) 그리기
    if (backgroundCharacter) {
        ctx.fillStyle = 'purple';
        ctx.font = 'bold 30px Arial';
        ctx.fillText(backgroundCharacter.text, backgroundCharacter.x, backgroundCharacter.y);
    }

    // 장애물 그리기 (네모 + 단어 텍스트)
    for (let obs of obstacles) {
        // 공격은 빨간색, 바퀴벌레는 갈색, 나머지는 초록색
        if(obs.type === 'attack') ctx.fillStyle = 'red';
        else if(obs.type === 'roach') ctx.fillStyle = 'saddlebrown';
        else ctx.fillStyle = 'green';

        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        // 네모 한가운데 텍스트 정렬
        ctx.fillText(obs.text, obs.x + 5, obs.y + 25);
    }

    // 상태 표시
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

    // 게임 오버 처리
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

// --- 게임 루프 실행 ---
function gameLoop() {
    update();
    draw();
    if(!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
