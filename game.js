const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const config = {
    robot: {
        radius: 20,
        maxHp: 100,
        pointerLength: 30,
        angleSpeed: 0.03, // Radians per frame
        pointerShowsDashDirection: true // true = pointer shows movement direction, false = pointer shows facing/poop direction
    },
    charge: {
        minPower: 0.2, // Min proportion of max dash speed/dist
        maxPower: 1.0,
        minDamage: 20,
        maxDamage: 60,
        maxChargeTime: 1500, // milliseconds
    },
    dash: {
        baseSpeed: 25, // Base speed units per frame at max charge
        knockbackForce: 50, // Increased knockback force for enhanced hit back strength
    },
    friction: 0.90, // Slows down dashing bots slightly
    zone: {
        totalGameTime: 100000, // ms, total game time (e.g. 10 sec for testing)
        shrinkStartTime: 30000, // ms, time when shrinking starts (e.g. 3 sec for testing)
        shrinkDuration: 5000, // ms, total shrink time
        minRadius: 100, // min radius of safe zone
        damagePerSecondOutside: 10 // HP loss per second outside
    }
};

// --- Game State ---
let players = [];
let gameOver = false;
let winner = null;
let animationFrameId;
let safeZoneRadius = Math.sqrt((canvas.width ** 2 + canvas.height ** 2)) / 2; // 初始为对角线的一半，确保覆盖全画布
let safeZoneCenter = { x: canvas.width / 2, y: canvas.height / 2 };
let gameStartTime;
let particles = [];

// --- UI Elements ---
const p1HpElement = document.getElementById('p1-hp');
const p2HpElement = document.getElementById('p2-hp');
const p1ChargeElement = document.getElementById('p1-charge');
const p2ChargeElement = document.getElementById('p2-charge');
const gameOverElement = document.getElementById('game-over');
const winnerMessageElement = document.getElementById('winner-message');
const shrinkTimerElement = document.getElementById('shrink-timer');

// --- Robot Class ---
class Robot {
    constructor(x, y, color, id, controlKey = null) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.hp = config.robot.maxHp;
        this.radius = config.robot.radius;
        this.color = color;
        this.originalColor = color;
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
        this.isInSafeZone = true;
    }

    startCharge() {
        // Can only start charging if not already charging AND not currently dashing
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

            this.isCharging = false; // Stop charging
            this.isDashing = true;  // Start dashing
            // Log clarifies based on config
            const pointerMeaning = config.robot.pointerShowsDashDirection ? "dash direction" : "facing direction";
            console.log(`Player ${this.id} released charge. Power: ${this.chargePower.toFixed(2)}, Damage: ${this.dashDamage.toFixed(0)}. Dash Angle: ${dashAngle.toFixed(2)}. Current Pointer shows: ${pointerMeaning}`);

            this.updateChargeIndicator(0); // Reset charge indicator bar
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
            const spreadAngle = (Math.random() - 0.5) * 1.5; // 更广角度：-0.75 ~ 0.75 radians
            const angle = this.angle + spreadAngle; // spray BACKWARD from dash direction (angle 是正向方向)
            const distance = Math.random() * 25 + 10; // 拉远喷射范围
            particles.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                size: Math.random() * 10 + 10 + distance * 0.2, // 更远的粒子更大，更近的更小
                rotation: Math.random() * Math.PI * 2,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: Math.floor(Math.random() * 20 + 20) // 20 ~ 40
            });
            this.y += this.dashVelY;
            // === boundary reflection (billiard‑style) ===
            if (this.x < this.radius) {
                this.x = this.radius;
                this.dashVelX = Math.abs(this.dashVelX);
            }
            if (this.x > canvas.width - this.radius) {
                this.x = canvas.width - this.radius;
                this.dashVelX = -Math.abs(this.dashVelX);
            }
            if (this.y < this.radius) {
                this.y = this.radius;
                this.dashVelY = Math.abs(this.dashVelY);
            }
            if (this.y > canvas.height - this.radius) {
                this.y = canvas.height - this.radius;
                this.dashVelY = -Math.abs(this.dashVelY);
            }
            // === end reflection ===

            // Apply friction
            this.dashVelX *= config.friction;
            this.dashVelY *= config.friction;

            // Check if dash should end (low speed or out of bounds)
            const speed = Math.sqrt(this.dashVelX ** 2 + this.dashVelY ** 2);
            if (speed < 0.5) {
                this.isDashing = false; // Stop dashing
                this.dashVelX = 0;
                this.dashVelY = 0;
                console.log(`Player ${this.id} dash ended.`);

                // --- NEW: Charge Buffering ---
                // If the control is still held down when the dash ends, immediately start charging again.
                if (this.isControlDown) {
                    console.log(`Player ${this.id} buffering charge input.`);
                    this.startCharge();
                }
                // --- End of Charge Buffering ---
            }

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

        // Determine pointer angle based on config
        let displayAngle = config.robot.pointerShowsDashDirection ? this.angle + Math.PI : this.angle;

        // Draw Direction Pointer
        const pointerEndX = this.x + Math.cos(displayAngle) * config.robot.pointerLength;
        const pointerEndY = this.y + Math.sin(displayAngle) * config.robot.pointerLength;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(pointerEndX, pointerEndY);
        ctx.stroke();

        // Draw HP above the bot
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.round(this.hp))}`, this.x, this.y - this.radius - 5);
    }

    takeDamage(damage, knockbackDirX, knockbackDirY) {
        // Optional: Reduce damage or prevent knockback if already dashing?
        // if (this.isDashing) return; // Basic invulnerability while dashing

        this.hp -= damage;
        console.log(`Player ${this.id} took ${damage.toFixed(0)} damage. HP left: ${this.hp.toFixed(0)}`);

        // Apply Knockback only if not dashing (prevents self-knockback during head-on collision resolution)
        if (!this.isDashing) {
            const knockbackDist = config.dash.knockbackForce * 2 * (damage / config.charge.maxDamage);
            this.applyKnockback(knockbackDirX, knockbackDirY, knockbackDist);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            endGame(players.find(p => p !== this)); // The other player wins
        }
        this.triggerHitEffect();
    }

    applyKnockback(dirX, dirY, distance) {
        const totalFrames = 20;
        let frame = 0;
        const initialSpeed = distance / totalFrames * 2;

        const knockbackInterval = setInterval(() => {
            const progress = frame / totalFrames;
            const speed = initialSpeed * (1 - progress);

            this.x += dirX * speed;
            this.y += dirY * speed;

            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

            frame++;
            if (frame >= totalFrames) clearInterval(knockbackInterval);
        }, 16);
    }

    triggerHitEffect() {
        const originalColor = this.originalColor;
        let flashes = 5;
        const flashInterval = setInterval(() => {
            this.color = this.color === 'white' ? originalColor : 'white';
            flashes--;
            if (flashes === 0) {
                clearInterval(flashInterval);
                this.color = originalColor;
            }
        }, 50);
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
            // Knockback direction is away from the collision point
            const knockbackDirX1 = -Math.cos(collisionAngle);
            const knockbackDirY1 = -Math.sin(collisionAngle);
            const knockbackDirX2 = Math.cos(collisionAngle);
            const knockbackDirY2 = Math.sin(collisionAngle);

            // Both take damage from the other's dash
            // Pass knockback direction for the takeDamage function
            p2.takeDamage(p1.dashDamage, knockbackDirX2, knockbackDirY2);
            p1.takeDamage(p2.dashDamage, knockbackDirX1, knockbackDirY1);

            // Both dashes are stopped immediately after collision resolution
            p1.isDashing = false; p1.dashVelX = 0; p1.dashVelY = 0;
            p2.isDashing = false; p2.dashVelX = 0; p2.dashVelY = 0;

            // Check for game over immediately after head-on collision damage
            if (p1.hp <= 0 && p2.hp <= 0) {
                endGame(null); // Draw or special condition
            } else if (p1.hp <= 0) {
                endGame(p2);
            } else if (p2.hp <= 0) {
                endGame(p1);
            }
        }
    }
}

function handleCollision(attacker, defender) {
    // Check distance between centers
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = attacker.radius + defender.radius;

    if (distance < minDistance) {
        console.log(`Collision! Player ${attacker.id} hit Player ${defender.id}`);

        // Calculate knockback direction (away from attacker's center)
        const knockbackAngle = Math.atan2(dy, dx);
        const knockbackDirX = Math.cos(knockbackAngle);
        const knockbackDirY = Math.sin(knockbackAngle);

        // Defender takes damage and knockback
        defender.takeDamage(attacker.dashDamage, knockbackDirX, knockbackDirY);

        // Stop attacker's dash immediately upon hitting the defender
        attacker.isDashing = false;
        attacker.dashVelX = 0;
        attacker.dashVelY = 0;

        // Check for game over immediately after collision damage
        if (defender.hp <= 0) {
            endGame(attacker);
        }
    }
}

// --- Game Loop ---
function gameLoop(timestamp) {
    if (gameOver) return;

    const currentTime = Date.now();
    const elapsed = currentTime - gameStartTime;

    // Handle safe zone shrinking
    if (elapsed > config.zone.shrinkStartTime && elapsed < config.zone.shrinkStartTime + config.zone.shrinkDuration) {
        const t = (elapsed - config.zone.shrinkStartTime) / config.zone.shrinkDuration;
        const maxRadius = canvas.width / 2;
        safeZoneRadius = maxRadius - (maxRadius - config.zone.minRadius) * t;
    } else if (elapsed >= config.zone.shrinkStartTime + config.zone.shrinkDuration) {
        safeZoneRadius = config.zone.minRadius;
    }

    // Apply damage if outside safe zone
    players.forEach(player => {
        const dx = player.x - safeZoneCenter.x;
        const dy = player.y - safeZoneCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const currentlyInSafeZone = distance <= safeZoneRadius;

        if (!currentlyInSafeZone) {
            player.takeDamage(config.zone.damagePerSecondOutside * (1 / 60), 0, 0); // Assume 60fps
            player.isInSafeZone = false;
        } else {
            // If player刚从圈外回到圈内，重置颜色
            if (!player.isInSafeZone) {
                player.color = player.originalColor;
                player.isInSafeZone = true;
            }
        }
    });

    // Show countdown timer
    const remaining = Math.max(0, config.zone.totalGameTime - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    document.getElementById('timer').textContent = `Time Left: ${seconds}s`;
    const shrinkRemaining = Math.max(0, config.zone.shrinkStartTime - elapsed);
    const shrinkSeconds = Math.ceil(shrinkRemaining / 1000);
    shrinkTimerElement.textContent = shrinkRemaining > 0
        ? `Shrink In: ${shrinkSeconds}s`
        : 'Shrinking...';

    if (remaining <= 0) {
        endGame(null);
    }

    // Update State
    players.forEach(player => player.update());
    // Collision checks happen after updates
    checkCollisions();

    // Update UI (Reflects state AFTER updates and collisions)
    p1HpElement.textContent = Math.max(0, Math.round(players[0].hp));
    p2HpElement.textContent = Math.max(0, Math.round(players[1].hp));

    // Draw (Reflects the very latest state)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.radius *= 0.95;
    });
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = p.life / 40; // 逐渐变透明（假设最大 life 是 40）
        ctx.fillText('💩', 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
    });
    drawSafeZoneCircle();
    players.forEach(player => player.draw(ctx));

    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function setupInputListeners() {
    // Player 1: Mouse
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0 && !gameOver) { // Left mouse button
            players[0].isControlDown = true;
            // Attempt to start charge (will only work if not dashing)
            players[0].startCharge();
        }
    });
    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0 && !gameOver) { // Left mouse button
            // Only release charge if the control was actually down for this player
            if (players[0].isControlDown) {
                players[0].isControlDown = false;
                players[0].releaseCharge(); // Attempt to release charge
            }
        }
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault()); // Prevent right-click menu
    canvas.addEventListener('mouseleave', (event) => {
        // If mouse leaves canvas while button is held, consider it a release
        if (players[0].isControlDown && event.button === 0 && !gameOver) {
            players[0].isControlDown = false;
            players[0].releaseCharge();
        }
    });

    // Player 2: Keyboard
    window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === players[1].controlKey && !players[1].isControlDown && !gameOver) {
            players[1].isControlDown = true;
            // Attempt to start charge (will only work if not dashing)
            players[1].startCharge();
        }
    });
    window.addEventListener('keyup', (event) => {
        if (event.key.toLowerCase() === players[1].controlKey && !gameOver) {
            // Only release charge if the control was actually down for this player
            if (players[1].isControlDown) {
                players[1].isControlDown = false;
                players[1].releaseCharge(); // Attempt to release charge
            }
        }
    });
}

// --- Game Management ---
function initGame() {
    console.log("Initializing game...");
    gameOver = false;
    winner = null;
    gameOverElement.style.display = 'none';
    gameStartTime = Date.now();
    safeZoneRadius = Math.sqrt((canvas.width ** 2 + canvas.height ** 2)) / 2;

    const padding = 100; // Initial distance from edge
    players = [
        new Robot(padding, canvas.height / 2, 'red', 1),
        new Robot(canvas.width - padding, canvas.height / 2, 'blue', 2, 'l') // P2 uses 'l' key
    ];

    // Reset UI elements
    p1HpElement.textContent = config.robot.maxHp;
    p2HpElement.textContent = config.robot.maxHp;
    p1ChargeElement.style.width = '0%';
    p2ChargeElement.style.width = '0%';

    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Clear previous loop if any
    setupInputListeners(); // Re-setup inputs for the new game
    gameLoop(); // Start the main game loop
}

function endGame(winningPlayer) {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    winner = winningPlayer;

    if (winningPlayer) {
        console.log(`Game Over! Player ${winner.id} wins!`);
        winnerMessageElement.textContent = `Player ${winner.id} (${winner.color}) wins!`;
    } else {
        console.log("Game Over! It's a draw!");
        winnerMessageElement.textContent = `Draw!`; // Handle draw case
    }
    gameOverElement.style.display = 'block';

    // Stop players' actions
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
    particles = [];
    initGame(); // Re-initialize the game state
}

// --- Start the Game ---
initGame(); // Initial game start when the script loads

function generateStars(count, width, height) {
    const container = document.getElementById('star-background');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 0.5;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.top = `${Math.random() * height}px`;
        star.style.left = `${Math.random() * width}px`;
        container.appendChild(star);
    }
}

function setupStarfield() {
    const update = () => {
        generateStars(200, window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', update);
    update();
}

setupStarfield();

function drawSafeZoneCircle() {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(safeZoneCenter.x, safeZoneCenter.y, safeZoneRadius, 0, Math.PI * 2);
    ctx.stroke();
}
