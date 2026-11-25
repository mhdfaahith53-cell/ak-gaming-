
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const healthText = document.getElementById("health");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");

let player;
let ball;
let enemies = [];
let bullets = [];
let particles = [];
let score = 0;
let health = 100;
let running = false;
let keys = {};
let mouse = { x: 400, y: 225 };
let lastShot = 0;
let lastSpawn = 0;
let animationId;
let shootingInterval;

const animalTypes = [
    { emoji: "🐺", size: 17, speed: 1.5 },
    { emoji: "🦊", size: 15, speed: 2 },
    { emoji: "🐻", size: 20, speed: 1.1 },
    { emoji: "🐗", size: 18, speed: 1.6 }
];

function resetGame() {
    player = { x: 400, y: 225, size: 16, speed: 4 };
    ball = { x: 240, y: 225, radius: 20, vx: 2.8, vy: 2.1, rotation: 0 };
    enemies = [];
    bullets = [];
    particles = [];
    score = 0;
    health = 100;
    lastShot = 0;
    lastSpawn = 0;
    updateStats();
}

function updateStats() {
    healthText.textContent = health;
    scoreText.textContent = score;
}

function startGame() {
    cancelAnimationFrame(animationId);
    stopTouchFiring();
    resetGame();
    running = true;
    message.textContent = "BATTLE STARTED!";
    document.getElementById("startBtn").textContent = "RESTART GAME";
    gameLoop();
}

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

document.querySelectorAll(".direction-button").forEach(button => {
    const activePointers = new Set();
    const key = button.dataset.key;

    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        activePointers.add(e.pointerId);
        keys[key] = true;
        button.setPointerCapture(e.pointerId);
    });

    const releaseDirection = e => {
        activePointers.delete(e.pointerId);
        keys[key] = activePointers.size > 0;
    };

    button.addEventListener("pointerup", releaseDirection);
    button.addEventListener("pointercancel", releaseDirection);
    button.addEventListener("lostpointercapture", releaseDirection);
});

const fireButton = document.getElementById("fireButton");

fireButton.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!running || shootingInterval) return;

    fireButton.setPointerCapture(e.pointerId);
    shootAtNearestEnemy();
    shootingInterval = window.setInterval(shootAtNearestEnemy, 250);
});

function stopTouchFiring() {
    if (shootingInterval) {
        window.clearInterval(shootingInterval);
        shootingInterval = undefined;
    }
}

fireButton.addEventListener("pointerup", stopTouchFiring);
fireButton.addEventListener("pointercancel", stopTouchFiring);
fireButton.addEventListener("lostpointercapture", stopTouchFiring);

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * canvas.width / rect.width;
    mouse.y = (e.clientY - rect.top) * canvas.height / rect.height;
});

canvas.addEventListener("click", shoot);

function shootAtNearestEnemy() {
    if (!running) return;

    if (enemies.length > 0) {
        let nearest = enemies[0];
        let nearestDistance = Math.hypot(player.x - nearest.x, player.y - nearest.y);

        enemies.forEach(enemy => {
            const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (distance < nearestDistance) {
                nearest = enemy;
                nearestDistance = distance;
            }
        });

        mouse.x = nearest.x;
        mouse.y = nearest.y;
    }

    shoot();
}

function shoot() {
    if (!running) return;

    const now = Date.now();
    if (now - lastShot < 250) return;
    lastShot = now;

    const angle = Math.atan2(
        mouse.y - player.y,
        mouse.x - player.x
    );

    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 9,
        vy: Math.sin(angle) * 9,
        life: 70
    });
}

function emitFire(x, y, count, velocityX = 0, velocityY = 0) {
    for (let i = 0; i < count; i++) {
        const life = 10 + Math.random() * 8;
        particles.push({
            x,
            y,
            vx: -velocityX * 0.12 + (Math.random() - 0.5) * 1.6,
            vy: -velocityY * 0.12 + (Math.random() - 0.5) * 1.6,
            size: 2 + Math.random() * 3,
            life,
            maxLife: life
        });
    }
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const animal = animalTypes[Math.floor(Math.random() * animalTypes.length)];
    let x, y;

    if (side === 0) {
        x = Math.random() * 800; y = 0;
    } else if (side === 1) {
        x = 800; y = Math.random() * 450;
    } else if (side === 2) {
        x = Math.random() * 800; y = 450;
    } else {
        x = 0; y = Math.random() * 450;
    }

    enemies.push({
        x, y,
        emoji: animal.emoji,
        size: animal.size,
        speed: animal.speed + Math.random() * 0.3
    });
}

function update() {
    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    player.x = Math.max(16, Math.min(784, player.x));
    player.y = Math.max(16, Math.min(434, player.y));

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.rotation += Math.hypot(ball.vx, ball.vy) / ball.radius * 0.035;

    if (ball.x < ball.radius || ball.x > 800 - ball.radius) {
        ball.x = Math.max(ball.radius, Math.min(800 - ball.radius, ball.x));
        ball.vx *= -1;
    }

    if (ball.y < ball.radius || ball.y > 450 - ball.radius) {
        ball.y = Math.max(ball.radius, Math.min(450 - ball.radius, ball.y));
        ball.vy *= -1;
    }

    const now = Date.now();

    if (now - lastSpawn > 1100) {
        spawnEnemy();
        lastSpawn = now;
    }

    bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life % 2 === 0) {
            emitFire(b.x, b.y, 1, b.vx, b.vy);
        }
    });

    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.97;
        particle.vy *= 0.97;
        particle.size *= 0.97;
        particle.life--;
    });
    particles = particles.filter(particle => particle.life > 0);

    bullets = bullets.filter(b =>
        b.life > 0 &&
        b.x > 0 && b.x < 800 &&
        b.y > 0 && b.y < 450
    );

    enemies.forEach(enemy => {
        const angle = Math.atan2(
            player.y - enemy.y,
            player.x - enemy.x
        );

        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        if (Math.hypot(
            player.x - enemy.x,
            player.y - enemy.y
        ) < player.size + enemy.size) {
            health -= 1;
            enemy.x -= Math.cos(angle) * 2;
            enemy.y -= Math.sin(angle) * 2;
        }
    });

    bullets.forEach(b => {
        enemies.forEach(enemy => {
            if (b.life > 0 && !enemy.dead && Math.hypot(
                b.x - enemy.x,
                b.y - enemy.y
            ) < enemy.size + 5) {
                emitFire(enemy.x, enemy.y, 16);
                enemy.dead = true;
                b.life = 0;
                score += 10;
            }
        });
    });

    enemies = enemies.filter(e => !e.dead);

    updateStats();

    if (health <= 0) {
        health = 0;
        updateStats();
        running = false;
        stopTouchFiring();
        message.textContent = "GAME OVER! Your score: " + score;
    }
}

function draw() {
    ctx.clearRect(0, 0, 800, 450);

    // Background grid
    ctx.strokeStyle = "#202040";
    ctx.lineWidth = 1;

    for (let x = 0; x < 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 450);
        ctx.stroke();
    }

    for (let y = 0; y < 450; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
    }

    drawSoccerBall();

    // Player
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffff";
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    // Player aim line
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();

    // Fire trails and hit bursts
    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 10;
    particles.forEach(particle => {
        const fade = particle.life / particle.maxLife;
        ctx.globalAlpha = fade;
        ctx.fillStyle = fade > 0.65 ? "#fff59d" : fade > 0.3 ? "#ff9800" : "#f44336";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 20;

    // Bullets
    ctx.fillStyle = "#ffff00";
    ctx.shadowColor = "#ffff00";

    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Enemies
    ctx.shadowColor = "#ff1744";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    enemies.forEach(enemy => {
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);
    });

    ctx.shadowBlur = 0;
}

function drawSoccerBall() {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(ball.x + 5, ball.y + ball.radius * 0.75, ball.radius * 0.9, ball.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    ctx.scale(ball.radius, ball.radius);

    const surface = ctx.createRadialGradient(-0.35, -0.45, 0.08, 0, 0, 1);
    surface.addColorStop(0, "#ffffff");
    surface.addColorStop(0.65, "#e5e5e5");
    surface.addColorStop(1, "#777777");

    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.clip();

    ctx.fillStyle = "#181820";
    for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + i * Math.PI * 2 / 5;
        const centerX = i === 5 ? 0 : Math.cos(angle) * 0.68;
        const centerY = i === 5 ? 0 : Math.sin(angle) * 0.68;
        const patchRadius = i === 5 ? 0.25 : 0.2;

        ctx.beginPath();
        for (let point = 0; point < 5; point++) {
            const pointAngle = angle + point * Math.PI * 2 / 5;
            const x = centerX + Math.cos(pointAngle) * patchRadius;
            const y = centerY + Math.sin(pointAngle) * patchRadius;
            if (point === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function gameLoop() {
    if (!running) return;

    update();
    draw();

    if (running) {
        animationId = requestAnimationFrame(gameLoop);
    }
}
