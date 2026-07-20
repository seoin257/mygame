const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 🖼️ 이미지 불러오기 ---
const playerImg = new Image();
playerImg.src = 'player.png'; 

// --- 게임 상태 변수 ---
let phase = 1; 
let subPhase = 0;
let spawnTimer = 0; 
let spawnCount = 0; 
let score = 0;
let isGameOver = false;
let isGameClear = false;

let playerInput = ""; 
const keys = {};

// --- 플레이어 (7프레임 애니메이션 적용!) ---
// 🌟 플레이어 그리기 로직 교체
if (playerImg.complete && playerImg.width > 0) {
    // 1. 전체 가로 길이를 7프레임으로 나눕니다.
    let frameWidth = playerImg.width / player.frameCount; 
    let frameHeight = playerImg.height;

    // 2. 현재 frameX(0~6)에 해당하는 X좌표를 계산하여 잘라냅니다.
    // Math.floor를 사용하여 좌표를 딱딱 떨어지게 만듭니다.
    let sourceX = Math.floor(player.frameX * frameWidth);
    
    ctx.drawImage(
        playerImg,
        sourceX, 0,             // 원본 이미지에서 잘라낼 시작점 (X, Y)
        frameWidth, frameHeight,// 잘라낼 영역 크기
        Math.floor(player.x), Math.floor(player.y), // 캔버스에 그릴 위치
        player.w, player.h      // 캔버스에 그릴 크기 (40x80)
    );
} else {
    // 이미지가 아직 로딩 안 됐을 때 표시할 임시 박스
    ctx.fillStyle = 'blue'; 
    ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
}

// --- 드론 ---
const drone = {
    x: 180 - 40,
    y: -50,
    w: 40,
    h: 40,
    isAttached: false
};

// --- 장애물 배열 및 배경 캐릭터 ---
let obstacles = [];
let backgroundCharacter = null; 

// --- 입력 감지 ---
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Space') {
        if (phase === 1 || phase === 2) {
            if (!player.isJumping) {
                player.vy = player.jumpPower;
                player.isJumping = true;
            }
        } 
        else if (phase === 4 && subPhase >= 1) {
            let target = obstacles.find(obs => 
                Math.abs((drone.x + drone.w/2) - (obs.x + obs.w/2)) < 60 &&
                Math.abs((drone.y + drone.h/2) - (obs.y + obs.h/2)) < 60
            );
            
            if (target) {
                if (target.type === 'gem') isGameClear = true;
                else obstacles = obstacles.filter(o => o !== target);
            }
        }
    }

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

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function spawnObstacle(type, text, positionY, speed = 5, startX = 800, w = 50, h = 40) {
    obstacles.push({
        x: startX, y: positionY, w: w, h: h, type: type, text: text, speed: speed
    });
}

function checkCollision(p, obs) {
    let hitX = p.x;
    let hitW = p.w;
    if (drone.isAttached) {
        hitX = drone.x; 
        hitW = drone.w + p.w;
    }
    return (hitX < obs.x + obs.w && hitX + hitW > obs.x && p.y < obs.y + obs.h && p.y + p.h > obs.y);
}

// --- 메인 게임 물리 & 시나리오 업데이트 ---
function update() {
    if (isGameOver || isGameClear) return;

    // --- 🏃 플레이어 7프레임 애니메이션 업데이트 ---
    if (!player.isJumping) {
        player.animTimer++;
        // 프레임 수가 많아졌으므로 8에서 6으로 템포를 살짝 당겨 부드럽게 재생
        if (player.animTimer % 6 === 0) { 
            player.frameX = (player.frameX + 1) % player.frameCount;
        }
    } else {
        player.frameX = 0; // 점프 중일 때는 0번 프레임 고정 (원하는 번호로 변경 가능)
    }

    let moveSpeed = 6;

    if (phase === 1 || phase === 2) {
        player.vy += player.gravity;
        player.y += player.vy;
        if (player.y >= 350 - player.h) {
            player.y = 350 - player.h;
            player.vy = 0;
            player.isJumping = false;
        }
    } 
    else if (phase === 3 && subPhase === 2) {
        if (keys['KeyW'] && player.y > 0) player.y -= moveSpeed;
        if (keys['KeyS'] && player.y < 350 - player.h) player.y += moveSpeed;
        if (keys['KeyA'] && player.x > 40) player.x -= moveSpeed; 
        if (keys['KeyD'] && player.x < 800 - player.w) player.x += moveSpeed;
        
        drone.x = player.x - drone.w;
        drone.y = player.y;
    }
    else if (phase === 4 && subPhase >= 1) {
        if (keys['KeyW'] && drone.y > 0) drone.y -= moveSpeed;
        if (keys['KeyS'] && drone.y < 350 - drone.h) drone.y += moveSpeed;
        if (keys['KeyA'] && drone.x > 0) drone.x -= moveSpeed;
        if (keys['KeyD'] && drone.x < 800 - drone.w) drone.x += moveSpeed;
    }

    // --- 시나리오 엔진 ---
    if (phase === 1) {
        spawnTimer++;
        if (subPhase === 0) { 
            if (spawnTimer >= 70) { 
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                if (spawnCount >= 7) { subPhase = 1; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 1) { 
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
        else if (subPhase === 2) { 
            if (spawnTimer === 1) spawnObstacle('roach', '바퀴벌레', 310, 7);
            let isRoachAlive = obstacles.find(obs => obs.type === 'roach');
            if (spawnTimer > 10 && !isRoachAlive) {
                backgroundCharacter = null; 
                subPhase = 3; spawnTimer = 0; 
            }
        }
        else if (subPhase === 3) { 
            if (spawnTimer >= 70) { 
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                if (spawnCount >= 5) { subPhase = 4; spawnCount = 0; spawnTimer = -30; } 
            }
        }
        else if (subPhase === 4) { 
            if (spawnTimer === 0) backgroundCharacter = { text: 'B', x: 700, y: 270 }; 
            if (spawnTimer > 0 && spawnTimer % 80 === 0) { 
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('balloon', '풍선', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 5; spawnCount = 0; spawnTimer = -80; } 
            }
        }
        else if (subPhase === 5) { 
            if (spawnTimer === 0) backgroundCharacter = { text: 'C', x: 700, y: 270 }; 
            if (spawnTimer > 0 && spawnTimer % 80 === 0) { 
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('note', '음표', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 6; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 6) { 
            if (obstacles.length === 0) {
                backgroundCharacter = null; 
                phase = 2; subPhase = 0; spawnTimer = -30;  
            }
        }
    }
    else if (phase === 2) {
        spawnTimer++;
        if (subPhase === 0) {
            const errorPattern = [315, 315, 180, 315, 180]; 
            if (spawnTimer > 0 && spawnTimer % 50 === 0 && spawnCount < errorPattern.length) {
                let targetY = errorPattern[spawnCount];
                spawnObstacle('error', 'ERR', targetY, 10, 800, 35, 30);
                spawnCount++;
            }
            if (spawnCount >= errorPattern.length && obstacles.length === 0) {
                subPhase = 1; spawnCount = 0; spawnTimer = -40; 
            }
        }
        else if (subPhase === 1) {
            if (spawnTimer > 0 && spawnTimer % 110 === 0 && spawnCount < 5) {
                let equations = [
                    { q: '3! = ?', a: '6' }, { q: '2^4 = ?', a: '16' }, { q: '5! / 24 = ?', a: '5' },
                    { q: '4! - 11 = ?', a: '13' }, { q: '2^5 = ?', a: '32' }
                ];
                let eq = equations[spawnCount];
                obstacles.push({ x: 800, y: 50, w: 70, h: 300, type: 'lock', text: eq.q, mathAns: eq.a, speed: 1.5 });
                spawnCount++;
            }
            if (spawnCount >= 5 && obstacles.length === 0) {
                subPhase = 2; spawnCount = 0; spawnTimer = 0; 
            }
        }
        else if (subPhase === 2) {
            const dataWords = ['DATA', 'INFO', '0101', 'CODE', '404', 'BYTE', 'BUG', 'RAM'];
            if (spawnTimer <= 900) {
                if (spawnTimer % 22 === 0) {
                    let randomWord = dataWords[Math.floor(Math.random() * dataWords.length)];
                    let isHigh = Math.random() > 0.5;
                    let targetY = isHigh ? 200 : 310;
                    let randomSpeed = Math.floor(Math.random() * 3) + 7; 
                    spawnObstacle('data', randomWord, targetY, randomSpeed, 800, 50, 35);
                }
            } else if (obstacles.length === 0) {
                subPhase = 3; spawnTimer = -30;
            }
        }
        else if (subPhase === 3) {
            if (spawnTimer === 0) {
                spawnObstacle('hacker', '해커J왔다감 /(^3^)/', 60, 6, 800, 250, 20);
            }
            if (spawnTimer > 100 && obstacles.length === 0) {
                phase = 3; subPhase = 0; spawnTimer = 0;
            }
        }
    }
    else if (phase === 3) {
        spawnTimer++;
        if (subPhase === 0) {
            if (drone.y < player.y) {
                drone.y += 3; 
                drone.x = player.x - drone.w;
            } else {
                drone.isAttached = true;
                subPhase = 1;
            }
        }
        else if (subPhase === 1) {
            if (player.y > 110) { 
                player.y -= 2;
                drone.y = player.y;
            } else {
                subPhase = 2; spawnTimer = 0;
            }
        }
        else if (subPhase === 2) {
            if (spawnTimer > 120 && spawnTimer % 50 === 0 && spawnCount < 10) {
                let holeY = Math.floor(Math.random() * 150) + 50; 
                spawnObstacle('wall', '', 0, 7, 800, 60, holeY);
                spawnObstacle('wall', '', holeY + 90, 7, 800, 60, 350 - (holeY + 90));
                spawnCount++;
            }
            if (spawnCount >= 10 && obstacles.length === 0) {
                subPhase = 3; spawnTimer = 0;
            }
        }
        else if (subPhase === 3) {
            if (player.y < 270) {
                player.y += 3;
                drone.y = player.y;
            } else {
                player.y = 270;
                drone.isAttached = false;
                phase = 4; subPhase = 0; spawnTimer = 0;
            }
        }
    }
    else if (phase === 4) {
        spawnTimer++;
        if (subPhase === 0) {
            if (spawnTimer > 180) { subPhase = 1; spawnTimer = 0; }
        }
        else if (subPhase === 1) {
            if (spawnTimer > 0 && spawnTimer % 80 === 0 && spawnCount < 5) {
                spawnObstacle('garbage', '쓰레기', 310, 4, 800, 40, 40);
                spawnCount++;
            }
            if (spawnCount >= 5 && obstacles.length === 0) {
                subPhase = 2; spawnTimer = -60; 
            }
        }
        else if (subPhase === 2) {
            if (spawnTimer === 0) spawnObstacle('gem', '💎보석', 250, 3, 800, 50, 50);
            
            let isGemAlive = obstacles.find(obs => obs.type === 'gem');
            if (spawnTimer > 10 && !isGemAlive && !isGameClear) {
                isGameOver = true;
            }
        }
    }

    // 충돌 처리
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed; 
        if (phase === 4) {
            if (pCheckCollisionOnly(player, obs)) isGameOver = true;
        } else {
            if (checkCollision(player, obs)) isGameOver = true;
        }
    }
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 1000);
}

function pCheckCollisionOnly(p, obs) {
    return (p.x < obs.x + obs.w && p.x + p.w > obs.x && p.y < obs.y + obs.h && p.y + p.h > obs.y);
}

// --- 🎨 렌더링 로직 ---
function draw() {
    if (phase === 1) ctx.fillStyle = '#ffffff';
    else if (phase === 2) ctx.fillStyle = '#0a0a1a';
    else ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = (phase === 2) ? '#00ffff' : '#333'; 
    ctx.fillRect(0, 350, 800, 50);

    // 🌟 플레이어 그리기 (이미지가 로드되었으면 도트로, 아니면 기존 네모로)
    if (playerImg.complete && playerImg.width > 0) {
        // ★ 7프레임의 크기를 자동으로 계산해서 잘라냅니다! ★
        let frameWidth = playerImg.width / player.frameCount; 
        let frameHeight = playerImg.height;

        ctx.drawImage(
            playerImg,
            player.frameX * frameWidth, 0, // 원본 이미지에서 잘라낼 X, Y 위치
            frameWidth, frameHeight,       // 원본 이미지에서 잘라낼 너비, 높이
            Math.floor(player.x), Math.floor(player.y), // 캔버스에 그릴 위치
            player.w, player.h             // 캔버스에 그릴 크기 (40x80)
        );
    } else {
        // 이미지가 로딩 중이거나 경로가 틀렸을 때 표시할 임시 파란 네모
        ctx.fillStyle = (phase === 2) ? '#00ffff' : 'blue'; 
        ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
    }

    if (phase >= 3) {
        ctx.fillStyle = '#FFD700'; 
        ctx.fillRect(Math.floor(drone.x), Math.floor(drone.y), drone.w, drone.h);
        ctx.fillStyle = 'gray';
        ctx.fillRect(Math.floor(drone.x - 5), Math.floor(drone.y - 5), 15, 5);
        ctx.fillRect(Math.floor(drone.x + 30), Math.floor(drone.y - 5), 15, 5);
    }
    
    if (backgroundCharacter) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(Math.floor(backgroundCharacter.x), Math.floor(backgroundCharacter.y), 40, 80);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(backgroundCharacter.text, Math.floor(backgroundCharacter.x + 12), Math.floor(backgroundCharacter.y + 45));

        if (backgroundCharacter.warning) {
            ctx.fillStyle = 'red';
            ctx.font = 'bold 40px Arial';
            ctx.fillText('!', Math.floor(backgroundCharacter.x + 15), Math.floor(backgroundCharacter.y - 15));
        }
    }

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
        else if (obs.type === 'error') ctx.fillStyle = 'red';
        else if (obs.type === 'lock') ctx.fillStyle = '#555'; 
        else if (obs.type === 'data') ctx.fillStyle = '#0088ff'; 
        else if (obs.type === 'wall') ctx.fillStyle = '#444';
        else if (obs.type === 'garbage') ctx.fillStyle = '#553311';
        else if (obs.type === 'gem') ctx.fillStyle = '#FF00FF'; 
        else if (obs.type === 'hacker') ctx.fillStyle = 'transparent'; 
        else ctx.fillStyle = 'green';

        ctx.fillRect(Math.floor(obs.x), Math.floor(obs.y), obs.w, obs.h);
        
        if (obs.type === 'hacker') ctx.fillStyle = '#00ff00'; 
        else if (obs.type === 'lock') ctx.fillStyle = 'gold'; 
        else ctx.fillStyle = 'white';
        
        ctx.font = (obs.type === 'gem') ? '14px Arial' : (obs.type === 'lock' ? 'bold 20px Arial' : '16px Arial');
        
        if (obs.type === 'lock') {
            ctx.fillText(obs.text, Math.floor(obs.x + 5), Math.floor(obs.y + obs.h / 2));
        } else if (obs.type === 'error') {
            ctx.fillText(obs.text, Math.floor(obs.x - 2), Math.floor(obs.y + 20));
        } else if (obs.text !== '') {
            ctx.fillText(obs.text, Math.floor(obs.x + 5), Math.floor(obs.y + 25));
        }
    }

    ctx.fillStyle = (phase === 1) ? 'black' : 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

    if (phase === 2 && subPhase === 1) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`입력 중: [ ${playerInput} ]`, 330, 80);
    }

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", 280, 200);
        ctx.font = '20px Arial';
        ctx.fillText("F5를 눌러 재시작하세요.", 290, 240);
    }

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

// --- 고정 타임스텝 ---
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
