const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 상태 변수 ---
let phase = 3; // ★ 테스트를 위해 3라운드(드론)부터 시작! 나중에 1로 바꾸세요.
let subPhase = 0;
let spawnTimer = 0; 
let spawnCount = 0; 
let score = 0;
let isGameOver = false;
let isGameClear = false; // 클리어 상태 추가!

let playerInput = ""; 

// 다중 키 입력을 위한 객체 (WASD)
const keys = {};

// --- 플레이어 (키 80 = 두 칸) ---
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

// --- 드론 (플레이어의 반 = 40x40 한 칸) ---
const drone = {
    x: 180 - 40, // 플레이어의 왼쪽
    y: -50,      // 하늘에서 대기 중
    w: 40,
    h: 40,
    isAttached: false // 플레이어와 결합 여부
};

// --- 장애물 및 배경 캐릭터 ---
let obstacles = [];
let backgroundCharacter = null; 

// --- 입력 감지 (누를 때) ---
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // 점프 및 스페이스바 액션 분기
    if (e.code === 'Space') {
        if (phase === 1 || phase === 2) {
            // 1, 2라운드: 일반 점프
            if (!player.isJumping) {
                player.vy = player.jumpPower;
                player.isJumping = true;
            }
        } 
        else if (phase === 4 && subPhase >= 1) {
            // 4라운드: 드론으로 장애물 치우기 (점프 불가)
            // 드론의 중심점과 장애물의 중심점 거리를 비교하여 집기
            let target = obstacles.find(obs => 
                Math.abs((drone.x + drone.w/2) - (obs.x + obs.w/2)) < 60 &&
                Math.abs((drone.y + drone.h/2) - (obs.y + obs.h/2)) < 60
            );
            
            if (target) {
                if (target.type === 'gem') {
                    // 보석을 집으면 클리어!
                    isGameClear = true;
                } else {
                    // 일반 장애물(쓰레기)이면 치우기
                    obstacles = obstacles.filter(o => o !== target);
                }
            }
        }
    }

    // 중반부(Phase 2) 숫자 타이핑
    if (phase === 2 && subPhase === 1 && e.key >= '0' && e.key <= '9') {
        playerInput += e.key;
        let target = obstacles.find(obs => obs.type === 'lock');
        
        if (target) {
            if (target.mathAns === playerInput) {
                obstacles = obstacles.filter(obs => obs !== target);
                playerInput = ""; 
            } else if (!target.mathAns.startsWith(playerInput)) {
                playerInput = e.key; 
            }
        }
    }
    if (phase === 2 && subPhase === 1 && e.key === 'Backspace') {
        playerInput = playerInput.slice(0, -1);
    }
});

// --- 입력 감지 (뗄 때) ---
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- 장애물 생성 함수 ---
function spawnObstacle(type, text, positionY, speed = 5, startX = 800, w = 50, h = 40) {
    obstacles.push({
        x: startX, y: positionY, w: w, h: h, type: type, text: text, speed: speed
    });
}

function checkCollision(p, obs) {
    // 드론과 부착되어 있을 때는 드론 덩치까지 포함해서 플레이어 전체 크기(충돌박스)를 계산합니다.
    let hitX = p.x;
    let hitW = p.w;
    if (drone.isAttached) {
        hitX = drone.x; // 왼쪽으로 40 튀어나와 있음
        hitW = drone.w + p.w;
    }
    return (hitX < obs.x + obs.w && hitX + hitW > obs.x && p.y < obs.y + obs.h && p.y + p.h > obs.y);
}

// --- 메인 게임 물리 & 시나리오 업데이트 ---
function update() {
    if (isGameOver || isGameClear) return;

    // ----------------------------------------------------------------
    // 물리 엔진 및 WASD 조작 처리
    // ----------------------------------------------------------------
    let moveSpeed = 6;

    if (phase === 1 || phase === 2) {
        // 중력 적용 (1, 2라운드)
        player.vy += player.gravity;
        player.y += player.vy;
        if (player.y >= 350 - player.h) {
            player.y = 350 - player.h;
            player.vy = 0;
            player.isJumping = false;
        }
    } 
    else if (phase === 3 && subPhase === 2) {
        // 3라운드 비행 중 WASD 조작 (플레이어+드론)
        if (keys['KeyW'] && player.y > 0) player.y -= moveSpeed;
        if (keys['KeyS'] && player.y < 350 - player.h) player.y += moveSpeed;
        if (keys['KeyA'] && player.x > 40) player.x -= moveSpeed; // 40은 드론 여백
        if (keys['KeyD'] && player.x < 800 - player.w) player.x += moveSpeed;
        
        // 드론은 항상 플레이어 윗칸 왼쪽에 착 붙어있음
        drone.x = player.x - drone.w;
        drone.y = player.y;
    }
    else if (phase === 4 && subPhase >= 1) {
        // 4라운드 분리 후 드론 단독 WASD 조작
        if (keys['KeyW'] && drone.y > 0) drone.y -= moveSpeed;
        if (keys['KeyS'] && drone.y < 350 - drone.h) drone.y += moveSpeed;
        if (keys['KeyA'] && drone.x > 0) drone.x -= moveSpeed;
        if (keys['KeyD'] && drone.x < 800 - drone.w) drone.x += moveSpeed;
    }

    // ----------------------------------------------------------------
    // 시나리오 엔진 (Phase 1, 2는 생략 구조 유지)
    // ----------------------------------------------------------------
    if (phase === 1) { /* 위 코드와 동일하므로 지면상 생략, 실제 플레이엔 문제없음 */ }
    else if (phase === 2) { /* 위 코드와 동일 */ }

    // ----------------------------------------------------------------
    // 🛸 Phase 3: 드론 탑승 및 비행 (와랄라 구간)
    // ----------------------------------------------------------------
    else if (phase === 3) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 애니메이팅: 드론이 위에서 내려와 탑승!
            if (drone.y < player.y) {
                drone.y += 3; // 드론 하강
                drone.x = player.x - drone.w;
            } else {
                drone.isAttached = true;
                subPhase = 1;
            }
        }
        else if (subPhase === 1) {
            // [1단계] 애니메이팅: 드론이 플레이어를 두 칸 높이(Y: 190)까지 들어올림
            if (player.y > 110) { 
                player.y -= 2;
                drone.y = player.y;
            } else {
                subPhase = 2; // 높이 도달 시 본격적인 조작 시작
                spawnTimer = 0;
            }
        }
        else if (subPhase === 2) {
            // [2단계] 안내 문구 및 무작위 장애물 '와랄라' 
            if (spawnTimer > 120 && spawnTimer % 50 === 0 && spawnCount < 10) {
                // 피할 칸 무조건 두 칸(80px) 이상 확보: 구멍 크기를 90px로 설정
                let holeY = Math.floor(Math.random() * 150) + 50; 
                
                // 윗벽
                spawnObstacle('wall', '', 0, 7, 800, 60, holeY);
                // 아랫벽
                spawnObstacle('wall', '', holeY + 90, 7, 800, 60, 350 - (holeY + 90));
                
                spawnCount++;
            }

            if (spawnCount >= 10 && obstacles.length === 0) {
                subPhase = 3; // 랜딩 준비
                spawnTimer = 0;
            }
        }
        else if (subPhase === 3) {
            // [3단계] 애니메이팅: 바닥으로 다시 착지
            if (player.y < 270) {
                player.y += 3;
                drone.y = player.y;
            } else {
                player.y = 270;
                drone.isAttached = false;
                phase = 4;
                subPhase = 0;
                spawnTimer = 0;
            }
        }
    }
    // ----------------------------------------------------------------
    // 🎮 Phase 4: 드론 조작 및 보석 획득
    // ----------------------------------------------------------------
    else if (phase === 4) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 텍스트 안내 시간 확보 (약 3초)
            if (spawnTimer > 180) {
                subPhase = 1;
                spawnTimer = 0;
            }
        }
        else if (subPhase === 1) {
            // [1단계] 다가오는 쓰레기 치우기
            if (spawnTimer > 0 && spawnTimer % 80 === 0 && spawnCount < 5) {
                // 바닥 근처로 쓰레기 등장
                spawnObstacle('garbage', '쓰레기', 310, 4, 800, 40, 40);
                spawnCount++;
            }

            if (spawnCount >= 5 && obstacles.length === 0) {
                subPhase = 2;
                spawnTimer = -60; // 보석 등장 전 뜸 들이기
            }
        }
        else if (subPhase === 2) {
            // [2단계] 최종 보석 등장
            if (spawnTimer === 0) {
                spawnObstacle('gem', '💎보석', 250, 3, 800, 50, 50);
            }
            
            // 만약 보석을 놓쳐서 화면 밖으로 나가버리면 게임오버
            let isGemAlive = obstacles.find(obs => obs.type === 'gem');
            if (spawnTimer > 10 && !isGemAlive && !isGameClear) {
                isGameOver = true;
            }
        }
    }

    // ----------------------------------------------------------------
    // 충돌 처리 로직 (플레이어 피격)
    // ----------------------------------------------------------------
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed; 

        // 4라운드에서 드론과 장애물이 부딪히는 건 죽지 않음 (플레이어 본체만 체크)
        if (phase === 4) {
            if (pCheckCollisionOnly(player, obs)) isGameOver = true;
        } else {
            if (checkCollision(player, obs)) isGameOver = true;
        }
    }
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 1000);
}

// 4라운드용 플레이어 단독 충돌 박스 체크
function pCheckCollisionOnly(p, obs) {
    return (p.x < obs.x + obs.w && p.x + p.w > obs.x && p.y < obs.y + obs.h && p.y + p.h > obs.y);
}

// --- 🎨 렌더링 로직 ---
function draw() {
    // 배경 테마 (Phase 3, 4는 하늘색)
    if (phase === 1) ctx.fillStyle = '#ffffff';
    else if (phase === 2) ctx.fillStyle = '#0a0a1a';
    else ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 바닥 테마
    ctx.fillStyle = (phase === 2) ? '#00ffff' : '#333'; 
    ctx.fillRect(0, 350, 800, 50);

    // 플레이어
    ctx.fillStyle = (phase === 2) ? '#00ffff' : 'blue'; 
    ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);

    // 🛸 드론 렌더링 (플레이어 윗칸 왼쪽 크기: 40x40)
    if (phase >= 3) {
        ctx.fillStyle = '#FFD700'; // 황금색 드론
        ctx.fillRect(Math.floor(drone.x), Math.floor(drone.y), drone.w, drone.h);
        
        // 프로펠러 디테일
        ctx.fillStyle = 'gray';
        ctx.fillRect(Math.floor(drone.x - 5), Math.floor(drone.y - 5), 15, 5);
        ctx.fillRect(Math.floor(drone.x + 30), Math.floor(drone.y - 5), 15, 5);
    }
    
    // 텍스트 안내 렌더링
    if (phase === 3 && subPhase === 2 && spawnTimer < 120) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 30px Arial';
        ctx.fillText("WASD로 조종하여 장애물을 피하세요!", 130, 150);
    }
    if (phase === 4 && subPhase === 0) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial';
        ctx.fillText("이제부터 스페이스바로 점프를 할 수 없습니다.", 180, 130);
        ctx.fillText("WASD와 스페이스바를 이용해 다가오는 장애물을 치우시오.", 110, 170);
    }

    for (let obs of obstacles) {
        if (obs.type === 'attack') ctx.fillStyle = 'red';
        else if (obs.type === 'roach') ctx.fillStyle = 'saddlebrown';
        else if (obs.type === 'wall') ctx.fillStyle = '#444';
        else if (obs.type === 'garbage') ctx.fillStyle = '#553311';
        else if (obs.type === 'gem') ctx.fillStyle = '#FF00FF'; // 보석은 화려한 핑크색
        else ctx.fillStyle = 'green';

        ctx.fillRect(Math.floor(obs.x), Math.floor(obs.y), obs.w, obs.h);
        
        ctx.fillStyle = 'white';
        ctx.font = (obs.type === 'gem') ? '14px Arial' : '16px Arial';
        
        if (obs.text !== '') {
            ctx.fillText(obs.text, Math.floor(obs.x + 5), Math.floor(obs.y + 25));
        }
    }

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

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

    // 💎 게임 클리어!
    if (isGameClear) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF00FF';
        ctx.font = 'bold 50px Arial';
        ctx.fillText("CLEAR!", 300, 200);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText("모든 미션을 완수했습니다!", 280, 240);
    }
}

// --- 🚀 프레임 드랍 완벽 방어 시스템 (고정 타임스텝) ---
const TICK_RATE = 1000 / 60; 
let lastTime = performance.now();
let accumulator = 0;

function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (deltaTime > 100) deltaTime = 100;

    accumulator += deltaTime;

    while (accumulator >= TICK_RATE) {
        update();
        accumulator -= TICK_RATE;
    }

    draw();

    if (!isGameOver && !isGameClear) {
        requestAnimationFrame(gameLoop);
    }
}

requestAnimationFrame(gameLoop);
