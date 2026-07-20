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
        
        let target = obstacles.find(obs => obs.type === 'lock');
        
        if (target) {
            if (target.mathAns === playerInput) {
                obstacles = obstacles.filter(obs => obs !== target);
                playerInput = ""; 
            } 
            else if (!target.mathAns.startsWith(playerInput)) {
                playerInput = e.key; 
            }
        }
    }
    
    if (phase === 2 && e.key === 'Backspace') {
        playerInput = playerInput.slice(0, -1);
    }
});

// --- 장애물 생성 함수 ---
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

    // 플레이어 물리 엔진
    player.vy += player.gravity;
    player.y += player.vy;

    if (player.y >= 350 - player.h) {
        player.y = 350 - player.h;
        player.vy = 0;
        player.isJumping = false;
    }

    // 1. 초반부(Phase 1) 시나리오 엔진 (빠른 템포 유지)
    if (phase === 1) {
        spawnTimer++;

        if (subPhase === 0) { 
            if (spawnTimer >= 60) { 
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
                
                if (spawnCount >= 3) { subPhase = 2; spawnCount = 0; spawnTimer = 0; } 
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
            if (spawnTimer >= 60) {
                spawnObstacle('cola', '콜라', 310);
                spawnCount++;
                spawnTimer = 0;
                if (spawnCount >= 5) { subPhase = 4; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 4) { 
            if (spawnTimer === 0) backgroundCharacter = { text: 'B', x: 700, y: 270 }; 
            
            if (spawnTimer > 0 && spawnTimer % 70 === 0) { 
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('balloon', '풍선', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 5; spawnCount = 0; spawnTimer = -20; } 
            }
        }
        else if (subPhase === 5) { 
            if (spawnTimer === 0) backgroundCharacter = { text: 'C', x: 700, y: 270 }; 
            
            if (spawnTimer > 0 && spawnTimer % 70 === 0) {
                let isUp = (spawnCount % 2 === 0);
                spawnObstacle('note', '음표', isUp ? 200 : 310, 5);
                spawnCount++;
                if (spawnCount >= 5) { subPhase = 6; spawnCount = 0; spawnTimer = 0; }
            }
        }
        else if (subPhase === 6) { 
            if (obstacles.length === 0) {
                backgroundCharacter = null; 
                phase = 2; 
                subPhase = 0;
                spawnTimer = -10; 
            }
        }
    }
    // ----------------------------------------------------------------
    // 2. 중반부(Phase 2) 가상공간 엔진
    // ----------------------------------------------------------------
    else if (phase === 2) {
        spawnTimer++;

        if (subPhase === 0) {
            // [0단계] 이지선다(상/하) 에러 아이콘
            if (spawnTimer > 0 && spawnTimer % 35 === 0) {
                let isHigh = Math.random() > 0.5;
                let targetY = isHigh ? 180 : 315; 
                
                spawnObstacle('error', 'ERR', targetY, 11, 800, 30, 30);
                spawnCount++;

                if (spawnCount >= 7) {
                    subPhase = 1;
                    spawnCount = 0;
                    spawnTimer = -50; 
                }
            }
        }
        else if (subPhase === 1) {
            // [1단계] 점프불가 수식 자물쇠 5개
            if (spawnTimer > 0 && spawnTimer % 90 === 0) {
                let equations = [
                    { q: '3! = ?', a: '6' },
                    { q: '2^4 = ?', a: '16' },
                    { q: '5! / 24 = ?', a: '5' },
                    { q: '4! - 11 = ?', a: '13' },
                    { q: '2^5 = ?', a: '32' }
                ];
                let eq = equations[spawnCount];
                
                obstacles.push({
                    x: 800, y: 50, w: 70, h: 300, type: 'lock', text: eq.q, mathAns: eq.a, speed: 2.5
                });
                
                spawnCount++;

                if (spawnCount >= 5) {
                    subPhase = 2;
                    spawnCount = 0;
                    spawnTimer = -150; 
                }
            }
        }
        else if (subPhase === 2) {
            // [2단계] 해커J 메시지
            if (spawnTimer === 0) {
                spawnObstacle('hacker', '해커J왔다감 /(^3^)/', 60, 7, 800, 250, 20);
            }

            if (spawnTimer > 100 && obstacles.length === 0) {
                // 아직 후반부가 없으므로 여기서 게임 정지 및 클리어 처리
                console.log("2라운드 클리어!");
            }
        }
    }

    // 장애물 이동 및 충돌 체크
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed; 

        if (checkCollision(player, obs)) {
            isGameOver = true;
        }
    }
    
    obstacles = obstacles.filter(obs => obs.x > -100 && obs.x < 1000);
}

// --- 🎨 렌더링 로직 (Math.floor를 이용한 픽셀 쪼개짐 방지 최적화) ---
function draw() {
    // 배경 테마 전환
    if (phase === 1) {
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = '#0a0a1a';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 바닥 테마 전환
    ctx.fillStyle = (phase === 1) ? '#333' : '#00ffff'; 
    ctx.fillRect(0, 350, 800, 50);

    // 🚀 플레이어 최적화 렌더링
    ctx.fillStyle = (phase === 1) ? 'blue' : '#00ffff'; 
    ctx.fillRect(Math.floor(player.x), Math.floor(player.y), player.w, player.h);
    
    // 배경 캐릭터
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

    // 🚀 장애물 최적화 렌더링
    for (let obs of obstacles) {
        if (obs.type === 'attack') ctx.fillStyle = 'red';
        else if (obs.type === 'roach') ctx.fillStyle = 'saddlebrown';
        else if (obs.type === 'error') ctx.fillStyle = 'red';
        else if (obs.type === 'lock') ctx.fillStyle = '#555'; 
        else if (obs.type === 'hacker') ctx.fillStyle = 'transparent'; 
        else ctx.fillStyle = 'green';

        ctx.fillRect(Math.floor(obs.x), Math.floor(obs.y), obs.w, obs.h);
        
        if (obs.type === 'hacker') ctx.fillStyle = '#00ff00'; 
        else if (obs.type === 'lock') ctx.fillStyle = 'gold'; 
        else ctx.fillStyle = 'white';
        
        ctx.font = (obs.type === 'lock') ? 'bold 20px Arial' : '16px Arial';
        
        if (obs.type === 'lock') {
            ctx.fillText(obs.text, Math.floor(obs.x + 5), Math.floor(obs.y + obs.h / 2));
        } else if (obs.type === 'error') {
            ctx.fillText(obs.text, Math.floor(obs.x - 2), Math.floor(obs.y + 20));
        } else {
            ctx.fillText(obs.text, Math.floor(obs.x + 5), Math.floor(obs.y + 25));
        }
    }

    // 상태 표시
    ctx.fillStyle = (phase === 1) ? 'black' : 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Phase: ${phase} / Sub: ${subPhase}`, 20, 30);

    // 수식 자물쇠 입력 UI 표시
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
