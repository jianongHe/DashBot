const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const config = {
    robot: {
        radius: 20,
        maxHp: 100,
        pointerLength: 30,
        angleSpeed: 0.03, // Radians per frame
        pointerShowsDashDirection: true // NEW: true = pointer shows movement direction, false = pointer shows facing/poop direction
    },
    charge: {
        minPower: 0.2, // Min proportion of max dash speed/dist
        maxPower: 1.0,
        minDamage: 20,
        maxDamage: 60,
        maxChargeTime: 1500, // milliseconds
    },
    dash: {
        baseSpeed: 15, // Base speed units per frame at max charge
        knockbackForce: 30, // How much the opponent is pushed
    },
    friction: 0.98 // Slows down dashing bots slightly
};

// --- Game State ---
let players = [];
let gameOver = false;
let winner = null;
let animationFrameId;

// --- UI Elements ---
const p1HpElement = document.getElementById('p1-hp');
const p2HpElement = document.getElementById('p2-hp');
const p1ChargeElement = document.getElementById('p1-charge');
const p2ChargeElement = document.getElementById('p2-charge');
const gameOverElement = document.getElementById('game-over');
const winnerMessageElement = document.getElementById('winner-message');

// --- Robot Class ---
class Robot {
    constructor(x, y, color, id, controlKey = null) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.hp = config.robot.maxHp;
        this.radius = config.robot.radius;
        this.color = color;
        // this.angle now consistently represents the robot's FACING direction (where poop comes out)
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = config.robot.angleSpeed;

        this.isCharging = false;
        this.chargeStartTime = 0;
        this.chargePower = 0; // 0 to 1

        this.isDashing = false;
        this.dashVelX = 0;
        this.dashVelY = 0;
        this.dashDamage = 0;

        this.controlKey = controlKey; // For keyboard control
        this.isControlDown = false; // Tracks if the control key/mouse is pressed
    }

    startCharge() {
        if (!this.isCharging && !this.isDashing) {
            this.isCharging = true;
            this.chargeStartTime = Date.now();
            this.chargePower = 0;
            console.log(`Player ${this.id} started charging.`);
        }
    }

    releaseCharge() {
        if (this.isCharging) {
            const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
            const chargeRatio = chargeDuration / config.charge.maxChargeTime; // 0 to 1

            this.chargePower = config.charge.minPower + (config.charge.maxPower - config.charge.minPower) * Math.sqrt(chargeRatio);
            const dashSpeed = config.dash.baseSpeed * this.chargePower;

            // Dash direction is ALWAYS opposite the facing angle (this.angle)
            const dashAngle = this.angle + Math.PI;

            this.dashVelX = Math.cos(dashAngle) * dashSpeed;
            this.dashVelY = Math.sin(dashAngle) * dashSpeed;
            this.dashDamage = config.charge.minDamage + (config.charge.maxDamage - config.charge.minDamage) * chargeRatio;

            this.isCharging = false;
            this.isDashing = true;
            // Log clarifies based on config
            const pointerMeaning = config.robot.pointerShowsDashDirection ? "dash direction" : "facing direction";
            console.log(`Player ${this.id} released charge. Power: ${this.chargePower.toFixed(2)}, Damage: ${this.dashDamage.toFixed(0)}. Dash Angle: ${dashAngle.toFixed(2)}. Current Pointer shows: ${pointerMeaning}`);

            this.updateChargeIndicator(0);
        }
    }

    update(deltaTime) {
        // Rotate facing angle if not dashing
        if (!this.isDashing) {
            this.angle = (this.angle + this.angleSpeed) % (Math.PI * 2);
        }

        // Update charge visual
        if (this.isCharging) {
            const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
            const chargeRatio = chargeDuration / config.charge.maxChargeTime;
            this.updateChargeIndicator(chargeRatio * 100);
        }

        // Update position if dashing
        if (this.isDashing) {
            this.x += this.dashVelX;
            this.y += this.dashVelY;

            // Apply friction
            this.dashVelX *= config.friction;
            this.dashVelY *= config.friction;

            // Stop dashing
            const speed = Math.sqrt(this.dashVelX ** 2 + this.dashVelY ** 2);
            if (speed < 0.5 || this.x < this.radius || this.x > canvas.width - this.radius || this.y < this.radius || this.y > canvas.height - this.radius) {
                this.isDashing = false;
                this.dashVelX = 0;
                this.dashVelY = 0;
                console.log(`Player ${this.id} dash ended.`);
            }

            // Boundary collision
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }
    }

    updateChargeIndicator(percentage) {
        const chargeBar = this.id === 1 ? p1ChargeElement : p2ChargeElement;
        if (chargeBar) {
            chargeBar.style.width = `${percentage}%`;
        }
    }


    draw(ctx) {
        // Draw Robot Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // --- MODIFIED: Determine pointer angle based on config ---
        let displayAngle;
        if (config.robot.pointerShowsDashDirection) {
            // Pointer shows actual movement direction (opposite of facing)
            displayAngle = this.angle + Math.PI;
        } else {
            // Pointer shows facing direction (where poop comes out)
            displayAngle = this.angle;
        }

        // Draw Direction Pointer using the determined displayAngle
        const pointerEndX = this.x + Math.cos(displayAngle) * config.robot.pointerLength;
        const pointerEndY = this.y + Math.sin(displayAngle) * config.robot.pointerLength;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(pointerEndX, pointerEndY);
        ctx.stroke();
        // --- End of modification ---

        // Draw HP above the bot
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.round(this.hp))}`, this.x, this.y - this.radius - 5);
    }

    takeDamage(damage, knockbackDirX, knockbackDirY) {
        if (this.isDashing) return; // Basic invulnerability while dashing

        this.hp -= damage;
        console.log(`Player ${this.id} took ${damage.toFixed(0)} damage. HP left: ${this.hp.toFixed(0)}`);

        // Apply Knockback
        const knockbackDist = config.dash.knockbackForce;
        this.x += knockbackDirX * knockbackDist;
        this.y += knockbackDirY * knockbackDist;

        // Clamp position
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.hp <= 0) {
            this.hp = 0;
            endGame(players.find(p => p !== this)); // The other player wins
        }
    }
}

// --- Collision Detection ---
function checkCollisions() {
    const [p1, p2] = players;

    // Attacker deals damage
    if (p1.isDashing && !p2.isDashing) {
        handleCollision(p1, p2);
    } else if (p2.isDashing && !p1.isDashing) {
        handleCollision(p2, p1);
    }
    // Head-on collision
    else if (p1.isDashing && p2.isDashing) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = p1.radius + p2.radius;

        if (distance < minDistance) {
            console.log("Head-on collision!");
            const collisionAngle = Math.atan2(dy, dx);
            const knockbackDirX1 = -Math.cos(collisionAngle);
            const knockbackDirY1 = -Math.sin(collisionAngle);
            const knockbackDirX2 = Math.cos(collisionAngle);
            const knockbackDirY2 = Math.sin(collisionAngle);

            p2.takeDamage(p1.dashDamage, knockbackDirX2, knockbackDirY2);
            p1.takeDamage(p2.dashDamage, knockbackDirX1, knockbackDirY1);

            p1.isDashing = false; p1.dashVelX = 0; p1.dashVelY = 0;
            p2.isDashing = false; p2.dashVelX = 0; p2.dashVelY = 0;
        }
    }
}

function handleCollision(attacker, defender) {
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = attacker.radius + defender.radius;

    if (distance < minDistance) {
        console.log(`Collision! Player ${attacker.id} hit Player ${defender.id}`);

        const knockbackAngle = Math.atan2(dy, dx);
        const knockbackDirX = Math.cos(knockbackAngle);
        const knockbackDirY = Math.sin(knockbackAngle);

        defender.takeDamage(attacker.dashDamage, knockbackDirX, knockbackDirY);

        // Stop attacker's dash on hit
        attacker.isDashing = false;
        attacker.dashVelX = 0;
        attacker.dashVelY = 0;
    }
}

// --- Game Loop ---
function gameLoop(timestamp) {
    if (gameOver) return;

    // Update State
    players.forEach(player => player.update());
    checkCollisions();

    // Update UI
    p1HpElement.textContent = Math.max(0, Math.round(players[0].hp));
    p2HpElement.textContent = Math.max(0, Math.round(players[1].hp));

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    players.forEach(player => player.draw(ctx));

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function setupInputListeners() {
    // Player 1: Mouse
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0 && !gameOver) {
            players[0].isControlDown = true;
            players[0].startCharge();
        }
    });
    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0 && !gameOver && players[0].isControlDown) {
            players[0].isControlDown = false;
            players[0].releaseCharge();
        }
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('mouseleave', (event) => {
        if (players[0].isControlDown && event.button === 0 && !gameOver) {
            players[0].isControlDown = false;
            players[0].releaseCharge();
        }
    });

    // Player 2: Keyboard ('L' key)
    window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === players[1].controlKey && !players[1].isControlDown && !gameOver) {
            players[1].isControlDown = true;
            players[1].startCharge();
        }
    });
    window.addEventListener('keyup', (event) => {
        if (event.key.toLowerCase() === players[1].controlKey && !gameOver && players[1].isControlDown) {
            players[1].isControlDown = false;
            players[1].releaseCharge();
        }
    });
}

// --- Game Management ---
function initGame() {
    console.log("Initializing game...");
    gameOver = false;
    winner = null;
    gameOverElement.style.display = 'none';

    const padding = 100;
    players = [
        new Robot(padding, canvas.height / 2, 'red', 1),
        new Robot(canvas.width - padding, canvas.height / 2, 'blue', 2, 'l')
    ];

    // Reset UI
    p1HpElement.textContent = config.robot.maxHp;
    p2HpElement.textContent = config.robot.maxHp;
    p1ChargeElement.style.width = '0%';
    p2ChargeElement.style.width = '0%';

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    setupInputListeners();
    gameLoop();
}

function endGame(winningPlayer) {
    if (gameOver) return;
    gameOver = true;
    winner = winningPlayer;
    console.log(`Game Over! Player ${winner.id} wins!`);

    winnerMessageElement.textContent = `玩家 ${winner.id} (${winner.color}) 获胜!`;
    gameOverElement.style.display = 'block';

    players.forEach(p => {
        p.isCharging = false;
        p.isDashing = false;
        p.dashVelX = 0;
        p.dashVelY = 0;
        p.updateChargeIndicator(0);
    });

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function resetGame() {
    console.log("Resetting game...");
    initGame();
}

// --- Start the Game ---
initGame();
