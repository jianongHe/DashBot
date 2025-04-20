/**
 * @fileoverview Main script for a 2-player physics-based arena game.
 * Players control robots, charge up dashes, and knock each other out
 * while a safe zone shrinks.
 */

// Load UFO image resources
const redUfoImage = new Image();
redUfoImage.src = 'assets/red_ufo.png';
const blueUfoImage = new Image();
blueUfoImage.src = 'assets/blue_ufo.png';

// --- Canvas & Rendering Context ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const MS_PER_SECOND = 1000;
const FRAMES_PER_SECOND = 60; // Assumed frame rate for dt calculations
const KNOCKBACK_DURATION_FRAMES = 20; // How many frames knockback effect lasts

// --- Game Configuration ---
// Centralized settings for game balance and mechanics
const config = {
    robot: {
        radius: 20,
        maxHp: 300,
        pointerLength: 30,
        angleSpeed: 0.03, // Radians per frame (how fast the pointer spins)
        pointerShowsDashDirection: true, // true = pointer shows MOVEMENT direction, false = pointer shows FACING/POOP direction
        hitFlashFrames: 5, // Number of flashes on hit
        hitFlashIntervalMs: 50, // Duration of each flash
        // 新增：圆环指针配置
        pointerRing: {
            numBars: 72,              // 圆环包含的竖条数量 (越多越平滑)
            baseRadiusOffset: 5,      // 圆环基线距离机器人边缘的距离
            baseBarHeight: 10,         // 竖条的基础（最小）高度
            maxPointerHeightBoost: 13,// 指向方向的竖条最大额外高度
            waveAmplitude: 2,         // 基础波动的振幅（高度变化）
            waveSpeed: 0.005,         // 波动动画的速度 (rad/ms)
            waveSpatialFrequency: 6,  // 空间频率，影响同时有多少波峰波谷
            pointerFocusExponent: 100, // 指针高亮区域的聚焦程度（值越大，高亮区域越窄）
            barWidth: 2,              // 每个竖条的线宽
            baseColor: 'rgba(99,136,162,0.4)', // 竖条的基础颜色
            highlightColor: 'rgb(145,179,220)' // 指针方向竖条的高亮颜色
        }
    },
    charge: {            barWidth: 2,              // 每个竖条的线宽
        minPower: 0.2, // Minimum dash power proportion (0 to 1)
        maxPower: 1.0, // Maximum dash power proportion
        minDamage: 20, // Damage dealt at minimum charge
        maxDamage: 60, // Damage dealt at maximum charge
        maxChargeTime: 1000, // milliseconds to reach max charge
    },
    dash: {
        baseSpeed: 25, // Speed units per frame at max charge power
        knockbackForce: 100, // Base strength of knockback effect
        minSpeedThreshold: 0.5, // Speed below which a dash ends
    },
    friction: 0.90, // Multiplier applied to dash velocity each frame (e.g., 0.9 means 10% speed loss)
    zone: {
        totalGameTime: 100000, // ms, total duration of a match
        shrinkStartTime: 30000, // ms, when the safe zone starts shrinking
        shrinkDuration: 5000, // ms, how long the shrinking process takes
        minRadius: 100, // Smallest radius the safe zone will reach
        damagePerTickOutside: (10 / FRAMES_PER_SECOND) // <--- CORRECTED CALCULATION
    },
    particle: {
        maxCount: 300, // Max number of poop particles
        baseLife: 25, // Base frames a particle lives
        randomLifeBoost: 20, // Max additional random frames
        baseSize: 15, // Base particle size
        randomSizeBoost: 15, // Max additional random size
        distanceSizeFactor: 0.2, // How much spawn distance affects size
        velocityFactor: 0.1, // How much robot speed affects particle speed
        spreadAngle: 1.5, // Max random angle offset (radians) for spray effect
        spawnDistanceBase: 10, // Min distance from robot center particles spawn
        spawnDistanceRandom: 25, // Max additional random distance
    }
};

// --- Helper Functions --- (可以放在文件顶部或 Robot 类外部)

/**
 * 解析 CSS 颜色字符串 (只支持 rgba格式) 为 [r, g, b, a] 数组
 * @param {string} colorString - e.g., "rgba(255, 100, 50, 0.8)"
 * @returns {number[] | null} - Array [r, g, b, a] (0-255 for rgb, 0-1 for a) or null if parse fails
 */
function parseRGBA(colorString) {
    const match = colorString.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
    if (match) {
        return [
            parseInt(match[1], 10),
            parseInt(match[2], 10),
            parseInt(match[3], 10),
            match[4] !== undefined ? parseFloat(match[4]) : 1.0 // Handle rgb() case too
        ];
    }
    return null; // Or return a default color array
}

/**
 * 在两个 RGBA 颜色之间进行线性插值
 * @param {number[]} color1 - 起始颜色 [r, g, b, a]
 * @param {number[]} color2 - 结束颜色 [r, g, b, a]
 * @param {number} t - 插值因子 (0.0 to 1.0)
 * @returns {string} - 插值后的 rgba 字符串
 */
function lerpColor(color1, color2, t) {
    t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    const a = color1[3] + (color2[3] - color1[3]) * t;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// --- Game State ---
// Variables tracking the current status of the game
let players = []; // Array holding the two Robot objects
let particles = []; // Array for visual effects (poop)
let gameOver = false;
let winner = null; // Stores the winning Robot object or null for draw/ongoing
let animationFrameId = null; // ID for cancelling the game loop animation frame
let safeZoneRadius; // Current radius of the safe zone
let safeZoneCenter; // Center coordinates {x, y} of the safe zone
let gameStartTime; // Timestamp when the current game started
let p1Ready = false; // Player 1 ready status
let p2Ready = false; // Player 2 ready status

// --- UI Element References ---
// Getting references to HTML elements for UI updates
const ui = {
    p1: {
        hp: document.getElementById('p1-hp'),
        charge: document.getElementById('p1-charge'),
        readyBtn: document.getElementById('p1-ready-btn'),
        readyStatus: document.getElementById('p1-ready-status'),
    },
    p2: {
        hp: document.getElementById('p2-hp'),
        charge: document.getElementById('p2-charge'),
        readyBtn: document.getElementById('p2-ready-btn'),
        readyStatus: document.getElementById('p2-ready-status'),
    },
    gameOver: document.getElementById('game-over'),
    winnerMessage: document.getElementById('winner-message'),
    shrinkTimer: document.getElementById('shrink-timer'),
    timer: document.getElementById('timer'),
    readyContainer: document.getElementById('ready-container'),
    starBackground: document.getElementById('star-background')
};

// --- Robot Class ---
class Robot {
    constructor(x, y, color, id, controlKey = null) {
        // Core properties
        this.id = id; // Player ID (1 or 2)
        this.x = x;
        this.y = y;
        this.hp = config.robot.maxHp;
        this.radius = config.robot.radius;
        this.color = color;
        this.originalColor = color; // For hit flash effect
        this.angle = Math.random() * Math.PI * 2; // Represents FACING direction (where poop comes out)
        this.controlKey = controlKey; // Assigned keyboard key for P2 (e.g., 'l')
        this.imageAngle = 0; // 飞碟图片的旋转角度

        // State flags
        this.isCharging = false;
        this.isDashing = false;
        this.isControlDown = false; // Tracks if the control key/mouse is currently pressed
        this.isInSafeZone = true; // Tracks if the robot was inside the zone last frame

        // Charge mechanics
        this.chargeStartTime = 0;
        this.chargePower = 0; // Calculated proportion (0 to 1) based on charge time

        // Dash mechanics
        this.dashVelX = 0; // Current horizontal velocity during dash
        this.dashVelY = 0; // Current vertical velocity during dash
        this.dashDamage = 0; // Damage this dash will inflict on hit
        this.hitOverlayAlpha = 0;

        this.lastHitEffectTime = 0; // 上次触发闪烁的时间
        this.hitEffectCooldown = 100; // 冷却时间（毫秒），可调整
    }

    // --- Actions ---

    startCharge() {
        // Can only start charging if not already charging AND not currently dashing
        if (!this.isCharging && !this.isDashing) {
            this.isCharging = true;
            this.chargeStartTime = Date.now();
            this.chargePower = 0; // Reset power at start
            console.log(`Player ${this.id} started charging.`);
        }
    }

    releaseCharge() {
        if (this.isCharging) {
            this.isCharging = false; // Stop charging immediately

            // Calculate charge duration and ratio (capped by max charge time)
            const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
            const chargeRatio = chargeDuration / config.charge.maxChargeTime; // 0 to 1

            // Calculate dash power (non-linear scaling using sqrt)
            this.chargePower = config.charge.minPower + (config.charge.maxPower - config.charge.minPower) * Math.sqrt(chargeRatio);

            // Calculate dash speed and damage based on power/ratio
            const dashSpeed = config.dash.baseSpeed * this.chargePower;
            this.dashDamage = config.charge.minDamage + (config.charge.maxDamage - config.charge.minDamage) * chargeRatio;

            // Dash direction is ALWAYS opposite the facing angle (visual pointer might differ based on config)
            const dashAngle = this.angle + Math.PI;
            this.dashVelX = Math.cos(dashAngle) * dashSpeed;
            this.dashVelY = Math.sin(dashAngle) * dashSpeed;

            this.isDashing = true; // Start dashing

            // Log details
            const pointerMeaning = config.robot.pointerShowsDashDirection ? "dash direction" : "facing direction";
            console.log(`Player ${this.id} released charge. Power: ${this.chargePower.toFixed(2)}, Damage: ${this.dashDamage.toFixed(0)}. Dash Angle: ${dashAngle.toFixed(2)}. Current Pointer shows: ${pointerMeaning}`);

            this.updateChargeIndicator(0); // Reset charge indicator bar visually
        }
    }

    takeDamage(damage, knockbackSourceX = this.x, knockbackSourceY = this.y, knockbackForceMultiplier = 1) {
        // Prevent taking damage if already dead
        if (this.hp <= 0) return;

        this.hp -= damage;
        console.log(`Player ${this.id} took ${damage.toFixed(0)} damage. HP left: ${this.hp.toFixed(0)}`);

        // Apply Knockback only if NOT currently dashing (prevents weird self-interaction in head-ons)
        // and if damage was actually dealt (relevant for zone damage with 0 knockback)
        if (!this.isDashing && damage > 0 && knockbackForceMultiplier > 0) {
            // Calculate direction away from the source of damage
            const dx = this.x - knockbackSourceX;
            const dy = this.y - knockbackSourceY;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1; // Avoid division by zero
            const knockbackDirX = dx / dist;
            const knockbackDirY = dy / dist;

            // Scale knockback distance by damage dealt relative to max possible charge damage
            const knockbackBaseDistance = config.dash.knockbackForce * knockbackForceMultiplier;
            const damageScale = Math.max(0.1, damage / config.charge.maxDamage); // Ensure some minimum knockback
            const knockbackDist = knockbackBaseDistance * damageScale;

            this.applyKnockback(knockbackDirX, knockbackDirY, knockbackDist);
        }

        this.triggerHitEffect(); // Visual feedback

        // Check for death
        if (this.hp <= 0) {
            this.hp = 0;
            // Determine winner based on who is left
            const otherPlayer = players.find(p => p !== this);
            endGame(otherPlayer); // The other player wins
        }
    }

    applyKnockback(dirX, dirY, distance) {
        let frame = 0;
        // Calculate initial speed for a simple ease-out effect
        const initialSpeed = distance / KNOCKBACK_DURATION_FRAMES * 2;

        const knockbackInterval = setInterval(() => {
            // Calculate speed decrease over the duration
            const progress = frame / KNOCKBACK_DURATION_FRAMES;
            const speed = initialSpeed * (1 - progress); // Speed decreases linearly

            // Apply movement
            this.x += dirX * speed;
            this.y += dirY * speed;

            // Clamp position to canvas bounds
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

            frame++;
            if (frame >= KNOCKBACK_DURATION_FRAMES) {
                clearInterval(knockbackInterval);
            }
        }, MS_PER_SECOND / FRAMES_PER_SECOND); // Run at ~60fps
    }

    triggerHitEffect() {
        const currentTime = Date.now();
        // 如果冷却时间未到，则不触发新效果
        if (currentTime - this.lastHitEffectTime < this.hitEffectCooldown) {
            return;
        }
        this.lastHitEffectTime = currentTime;

        // 原有闪烁逻辑
        this.hitOverlayAlpha = 0.6;
        let flashes = config.robot.hitFlashFrames;
        const flashInterval = setInterval(() => {
            this.color = this.color === 'white' ? this.originalColor : 'white';
            flashes--;
            if (flashes <= 0) {
                clearInterval(flashInterval);
                this.color = this.originalColor;
            }
        }, config.robot.hitFlashIntervalMs);
    }

    // --- Updates ---

    update() {
        // Rotate facing angle (pointer) if not dashing
        if (!this.isDashing) {
            // Note: Angle always rotates, regardless of charging status
            this.angle = (this.angle + config.robot.angleSpeed) % (Math.PI * 2);
            this.imageAngle = (this.imageAngle + config.robot.angleSpeed * 0.4) % (Math.PI * 2); // 比指针慢
        }

        // Update charge power visual if charging
        if (this.isCharging) {
            const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
            const chargeRatio = chargeDuration / config.charge.maxChargeTime;
            this.updateChargeIndicator(chargeRatio * 100); // UI expects percentage
        }

        // Update position and handle physics if dashing
        if (this.isDashing) {
            this.updateDashMovement();
        }
    }

    updateDashMovement() {
        this.x += this.dashVelX;
        this.y += this.dashVelY;

        this._handleBoundaryReflection();
        this._applyDashFriction();
        this._createDashParticles();

        // Check if dash should end (speed is too low)
        const speed = Math.sqrt(this.dashVelX ** 2 + this.dashVelY ** 2);
        if (speed < config.dash.minSpeedThreshold) {
            this._endDash();
        }
    }

    _handleBoundaryReflection() {
        // Reflects off canvas boundaries like a billiard ball
        if (this.x < this.radius) {
            this.x = this.radius;
            this.dashVelX = Math.abs(this.dashVelX); // Reflect horizontally
        } else if (this.x > canvas.width - this.radius) {
            this.x = canvas.width - this.radius;
            this.dashVelX = -Math.abs(this.dashVelX); // Reflect horizontally
        }

        if (this.y < this.radius) {
            this.y = this.radius;
            this.dashVelY = Math.abs(this.dashVelY); // Reflect vertically
        } else if (this.y > canvas.height - this.radius) {
            this.y = canvas.height - this.radius;
            this.dashVelY = -Math.abs(this.dashVelY); // Reflect vertically
        }
    }

    _applyDashFriction() {
        this.dashVelX *= config.friction;
        this.dashVelY *= config.friction;
    }

    _createDashParticles() {
        const currentSpeed = Math.sqrt(this.dashVelX ** 2 + this.dashVelY ** 2);
        // More particles generated at higher speeds
        const particleCount = Math.floor(currentSpeed / 5); // Arbitrary scaling factor

        for (let i = 0; i < particleCount; i++) {
            // Calculate base direction opposite to dash direction
            const dashAngle = Math.atan2(this.dashVelY, this.dashVelX);
            const baseParticleAngle = dashAngle + Math.PI;
            // Add random spread
            const spread = (Math.random() - 0.5) * config.particle.spreadAngle;
            const finalAngle = baseParticleAngle + spread;

            // Spawn particles slightly behind the robot
            const spawnDist = config.particle.spawnDistanceBase + Math.random() * config.particle.spawnDistanceRandom;
            const spawnX = this.x + Math.cos(finalAngle) * spawnDist;
            const spawnY = this.y + Math.sin(finalAngle) * spawnDist;

            particles.push({
                x: spawnX,
                y: spawnY,
                size: config.particle.baseSize + Math.random() * config.particle.randomSizeBoost + spawnDist * config.particle.distanceSizeFactor,
                rotation: Math.random() * Math.PI * 2,
                // Particle velocity is a fraction of the robot's speed in the particle's direction
                vx: Math.cos(finalAngle) * currentSpeed * config.particle.velocityFactor,
                vy: Math.sin(finalAngle) * currentSpeed * config.particle.velocityFactor,
                life: Math.floor(config.particle.baseLife + Math.random() * config.particle.randomLifeBoost) // Frames to live
            });
        }
        // Limit total particles to prevent performance issues
        if (particles.length > config.particle.maxCount) {
            particles.splice(0, particles.length - config.particle.maxCount);
        }
    }


    _endDash() {
        console.log(`Player ${this.id} dash ended.`);
        this.isDashing = false;
        this.dashVelX = 0;
        this.dashVelY = 0;
        this.dashDamage = 0; // Reset damage potential

        // --- Charge Buffering ---
        // If the control key/mouse is still held down when the dash ends,
        // immediately start charging again. Allows for smoother chaining.
        if (this.isControlDown) {
            console.log(`Player ${this.id} buffering charge input.`);
            this.startCharge();
        }
        // --- End of Charge Buffering ---
    }

    // --- UI Updates ---

    updateChargeIndicator(percentage) {
        const chargeBar = (this.id === 1) ? ui.p1.charge : ui.p2.charge;
        if (chargeBar) {
            chargeBar.style.width = `${percentage}%`;
        }
    }

    updateHpIndicator() {
        const hpElement = (this.id === 1) ? ui.p1.hp : ui.p2.hp;
        if (hpElement) {
            hpElement.textContent = Math.max(0, Math.round(this.hp));
        }
    }


    // --- Drawing ---

    draw(ctx) {
        // Draw Robot Body using UFO image
        const ufoImage = this.id === 1 ? redUfoImage : blueUfoImage;
        const size = this.radius * 2;
        if (ufoImage.complete) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.imageAngle);
            ctx.drawImage(ufoImage, -this.radius, -this.radius, size, size);
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.hitOverlayAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = this.hitOverlayAlpha;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            this.hitOverlayAlpha *= 0.8; // 每帧衰减
        }

        // Draw Pointer Ring
        this.drawPointerRing(ctx);

        // Draw HP Text above the bot (保持不变)
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.round(this.hp))}`, this.x, this.y - this.radius - 5);
    }

    // 新增：绘制圆环指针的方法
    drawPointerRing(ctx) {
        const ringConfig = config.robot.pointerRing;
        if (!ringConfig) return; // 如果没有配置则不绘制

        // 1. 确定目标方向角度 (和以前一样)
        let displayAngle = config.robot.pointerShowsDashDirection ? (this.angle + Math.PI) : this.angle;
        displayAngle = (displayAngle + Math.PI * 2) % (Math.PI * 2); // 确保角度在 0 到 2PI 之间

        // 2. 获取当前时间用于动画
        const currentTime = Date.now();

        // 3. 解析基础和高亮颜色 (只在需要时解析一次)
        // 注意：更优化的做法是在初始化时解析并存储颜色数组
        const baseColorRGBA = parseRGBA(ringConfig.baseColor) || [100, 100, 120, 0.4];
        const highlightColorRGBA = parseRGBA(ringConfig.highlightColor) || [255, 255, 255, 1.0];

        // 4. 计算圆环的基础半径
        const baseRingRadius = this.radius + ringConfig.baseRadiusOffset;

        // 5. 循环绘制每个竖条
        for (let i = 0; i < ringConfig.numBars; i++) {
            const barAngle = (i / ringConfig.numBars) * Math.PI * 2;

            // 计算竖条的起始点 (在基础圆环上)
            const startX = this.x + Math.cos(barAngle) * baseRingRadius;
            const startY = this.y + Math.sin(barAngle) * baseRingRadius;

            // 计算当前竖条角度与目标显示角度的最小差值 (处理环绕)
            let angleDiff = Math.abs(barAngle - displayAngle);
            angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff); // 考虑 0 度和 359 度是接近的

            // 计算目标高度因子 (决定竖条因为接近目标方向而增加多少高度)
            // 使用指数衰减的余弦函数，使得靠近目标方向时因子接近 1，远离时快速衰减到 0
            // pointerFocusExponent 控制聚焦程度，值越大，高亮区域越窄
            const targetHeightFactor = Math.pow(Math.cos(Math.min(angleDiff, Math.PI / 2)), ringConfig.pointerFocusExponent);


            // 计算波动高度偏移
            const waveOffset = Math.sin(currentTime * ringConfig.waveSpeed + barAngle * ringConfig.waveSpatialFrequency)
                * ringConfig.waveAmplitude;

            // 计算最终的竖条高度
            const barHeight = ringConfig.baseBarHeight                  // 基础高度
                + targetHeightFactor * ringConfig.maxPointerHeightBoost // 指针方向的额外高度
                + waveOffset;                                // 波动高度
            const finalBarHeight = Math.max(0, barHeight); // 确保高度不为负

            // 计算竖条的结束点
            const endX = this.x + Math.cos(barAngle) * (baseRingRadius + finalBarHeight);
            const endY = this.y + Math.sin(barAngle) * (baseRingRadius + finalBarHeight);

            // 计算竖条颜色 (根据 targetHeightFactor 在基础色和高亮色之间插值)
            const barColor = lerpColor(baseColorRGBA, highlightColorRGBA, targetHeightFactor);

            // 绘制竖条
            ctx.strokeStyle = barColor;
            ctx.lineWidth = ringConfig.barWidth;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
}

// --- Collision Detection & Handling ---

function checkCollisions() {
    // Simplified since we assume only 2 players
    if (players.length < 2) return;
    const [p1, p2] = players;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distanceSquared = dx * dx + dy * dy; // Use squared distance for efficiency
    const minDistance = p1.radius + p2.radius;
    const minDistanceSquared = minDistance * minDistance;

    // Proceed only if they are actually overlapping
    if (distanceSquared < minDistanceSquared) {
        // Scenario 1: P1 dashes into stationary P2
        if (p1.isDashing && !p2.isDashing) {
            console.log(`Collision: Player ${p1.id} dashed into Player ${p2.id}`);
            // P2 takes damage and knockback from P1's position
            p2.takeDamage(p1.dashDamage, p1.x, p1.y);
            // Stop P1's dash immediately upon hitting
            p1._endDash();
        }
        // Scenario 2: P2 dashes into stationary P1
        else if (p2.isDashing && !p1.isDashing) {
            console.log(`Collision: Player ${p2.id} dashed into Player ${p1.id}`);
            // P1 takes damage and knockback from P2's position
            p1.takeDamage(p2.dashDamage, p2.x, p2.y);
            // Stop P2's dash immediately upon hitting
            p2._endDash();
        }
        // Scenario 3: Head-on collision (both dashing)
        else if (p1.isDashing && p2.isDashing) {
            console.log("Head-on collision!");

            // Both take damage from the other, knockback originates from opponent's center
            // We pass the *opponent's* coordinates as the source for knockback direction
            p1.takeDamage(p2.dashDamage, p2.x, p2.y);
            p2.takeDamage(p1.dashDamage, p1.x, p1.y);

            // Both dashes are stopped immediately after collision resolution
            // Use _endDash carefully here as it checks for buffered input, which might not be desired in head-on?
            // For now, let's just stop them directly. Revisit if buffering feels wrong.
            p1.isDashing = false; p1.dashVelX = 0; p1.dashVelY = 0; p1.dashDamage = 0;
            p2.isDashing = false; p2.dashVelX = 0; p2.dashVelY = 0; p2.dashDamage = 0;

            // Check for game over immediately *after* both damages are applied
            // (Handles cases where both die simultaneously -> Draw)
            if (p1.hp <= 0 && p2.hp <= 0) {
                endGame(null); // Draw
            } else if (p1.hp <= 0) {
                endGame(p2); // P2 wins
            } else if (p2.hp <= 0) {
                endGame(p1); // P1 wins
            }
        }
        // Note: If neither is dashing, they can harmlessly overlap (or push slightly if physics were added)
    }
}


// --- Game Loop ---

function gameLoop(timestamp) {
    if (gameOver) return; // Stop the loop if game has ended

    const currentTime = Date.now();
    const elapsedMs = currentTime - gameStartTime;

    // --- Updates ---
    updateSafeZone(elapsedMs);
    updateTimers(elapsedMs);
    updatePlayers();
    applyZoneDamage(); // Apply damage *after* player position update
    checkCollisions(); // Check collisions *after* updates
    updateParticles(); // Update particle positions and life

    // --- Drawing ---
    clearCanvas();
    drawSafeZone();
    drawParticles();
    drawPlayers();

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Game Loop Helper Functions ---

function updateSafeZone(elapsedMs) {
    const zoneConfig = config.zone;
    const initialRadius = Math.sqrt((canvas.width ** 2 + canvas.height ** 2)) / 2; // Recalculate initial based on canvas size

    if (elapsedMs > zoneConfig.shrinkStartTime && elapsedMs < zoneConfig.shrinkStartTime + zoneConfig.shrinkDuration) {
        // Calculate shrinking progress (0 to 1)
        const shrinkProgress = (elapsedMs - zoneConfig.shrinkStartTime) / zoneConfig.shrinkDuration;
        // Interpolate radius between initial and minimum
        safeZoneRadius = initialRadius - (initialRadius - zoneConfig.minRadius) * shrinkProgress;
    } else if (elapsedMs >= zoneConfig.shrinkStartTime + zoneConfig.shrinkDuration) {
        // If shrink duration passed, clamp to minimum radius
        safeZoneRadius = zoneConfig.minRadius;
    }
    // Otherwise (before shrink start), radius remains at initial value (set in initGame)
}

function updateTimers(elapsedMs) {
    // Update main game timer
    const remainingTime = Math.max(0, config.zone.totalGameTime - elapsedMs);
    const secondsLeft = Math.ceil(remainingTime / MS_PER_SECOND);
    ui.timer.textContent = `Time Left: ${secondsLeft}s`;

    // Update shrink countdown timer
    const shrinkRemaining = Math.max(0, config.zone.shrinkStartTime - elapsedMs);
    if (shrinkRemaining > 0) {
        const shrinkSeconds = Math.ceil(shrinkRemaining / MS_PER_SECOND);
        ui.shrinkTimer.textContent = `Shrink In: ${shrinkSeconds}s`;
    } else if (elapsedMs < config.zone.shrinkStartTime + config.zone.shrinkDuration) {
        ui.shrinkTimer.textContent = 'Shrinking...';
    } else {
        ui.shrinkTimer.textContent = 'Zone Closed!';
    }


    // Check for game over due to time running out
    if (remainingTime <= 0 && !gameOver) {
        console.log("Time's up!");
        // Determine winner by HP, or draw if equal
        const [p1, p2] = players;
        if (p1.hp > p2.hp) endGame(p1);
        else if (p2.hp > p1.hp) endGame(p2);
        else endGame(null); // Draw if HP is equal
    }
}

function updatePlayers() {
    players.forEach(player => player.update());
}

function applyZoneDamage() {
    players.forEach(player => {
        const dx = player.x - safeZoneCenter.x;
        const dy = player.y - safeZoneCenter.y;
        const distanceSquared = dx * dx + dy * dy;
        const isInside = distanceSquared <= safeZoneRadius * safeZoneRadius;

        if (!isInside) {
            // Only apply damage if they were outside
            if (player.isInSafeZone) { // Log only when they first exit
                console.log(`Player ${player.id} is outside the safe zone.`);
            }
            player.takeDamage(config.zone.damagePerTickOutside, player.x, player.y, 0); // No knockback from zone
            player.isInSafeZone = false;
            // Optional: visual indicator for being outside (e.g., change color slightly)
            // player.color = 'grey'; // Example: visual feedback
        } else {
            // If player re-enters the zone, reset their state/visuals if needed
            if (!player.isInSafeZone) {
                // player.color = player.originalColor; // Reset color if changed
                console.log(`Player ${player.id} re-entered the safe zone.`);
                player.isInSafeZone = true;
            }
        }
    });
    // Update HP bars AFTER potential zone damage
    players.forEach(p => p.updateHpIndicator());
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        // Optional: Make particles fade or shrink
        // p.size *= 0.98;
    });
    // Remove dead particles
    particles = particles.filter(p => p.life > 0);
}


// --- Drawing Helper Functions ---

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawSafeZone() {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red semi-transparent circle
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(safeZoneCenter.x, safeZoneCenter.y, safeZoneRadius, 0, Math.PI * 2);
    ctx.stroke();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save(); // Save current context state
        ctx.translate(p.x, p.y); // Move origin to particle position
        ctx.rotate(p.rotation); // Rotate
        ctx.font = `${Math.max(1, p.size)}px sans-serif`; // Use particle size, ensure minimum 1px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Fade out particle based on remaining life
        ctx.globalAlpha = Math.max(0, p.life / (config.particle.baseLife + config.particle.randomLifeBoost)); // Fade based on max possible life
        ctx.fillStyle = 'saddlebrown'; // Poop color
        ctx.fillText('💩', 0, 0); // Draw emoji at the rotated origin
        ctx.restore(); // Restore context state (alpha, translation, rotation)
    });
}

function drawPlayers() {
    players.forEach(player => player.draw(ctx));
}

// --- Input Handling ---

function setupInputListeners() {
    // Ensure previous listeners are removed if game resets
    // (This simple example doesn't explicitly remove, relies on overwrite,
    // but in complex apps, use removeEventListener)

    // --- Player 1: Mouse Controls ---
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', preventContextMenu);
    canvas.addEventListener('mouseleave', handleMouseLeave); // Handle case where mouse leaves canvas while button is down

    // --- Player 2: Keyboard Controls ---
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function handleMouseDown(event) {
    if (event.button === 0 && !gameOver && players[0]) { // Left mouse button, game running, P1 exists
        players[0].isControlDown = true;
        players[0].startCharge(); // Attempt to start charge
    }
}

function handleMouseUp(event) {
    if (event.button === 0 && !gameOver && players[0]) { // Left mouse button
        // Only release charge if the control was actually tracked as 'down' for P1
        if (players[0].isControlDown) {
            players[0].isControlDown = false;
            players[0].releaseCharge(); // Attempt to release charge
        }
    }
}

function preventContextMenu(event) {
    event.preventDefault(); // Prevent browser's right-click menu
}

function handleMouseLeave(event) {
    // If mouse leaves canvas while button is held, treat it as releasing the charge
    if (players[0] && players[0].isControlDown && !gameOver) {
        console.log("Mouse left canvas during charge, releasing.");
        players[0].isControlDown = false;
        players[0].releaseCharge();
    }
}

function handleKeyDown(event) {
    if (!gameOver && players[1] && event.key.toLowerCase() === players[1].controlKey && !players[1].isControlDown) {
        // Check if game is running, P2 exists, key matches P2's control, and key wasn't already down
        players[1].isControlDown = true;
        players[1].startCharge(); // Attempt to start charge
    }
}

function handleKeyUp(event) {
    if (!gameOver && players[1] && event.key.toLowerCase() === players[1].controlKey) {
        // Check if game is running, P2 exists, key matches P2's control
        // Only release charge if the control was actually tracked as 'down' for P2
        if (players[1].isControlDown) {
            players[1].isControlDown = false;
            players[1].releaseCharge(); // Attempt to release charge
        }
    }
}

// --- Ready System ---

function checkBothReady() {
    if (p1Ready && p2Ready) {
        ui.readyContainer.style.display = 'none'; // Hide ready buttons/status
        initGame(); // Start the game
    }
}

function setupReadyButtons() {
    ui.p1.readyBtn.addEventListener('click', () => {
        p1Ready = !p1Ready; // Toggle ready state
        ui.p1.readyBtn.textContent = p1Ready ? 'Cancel Ready' : 'Player 1 Ready';
        ui.p1.readyStatus.textContent = p1Ready ? 'Ready!' : 'Not Ready';
        ui.p1.readyStatus.style.color = p1Ready ? 'lightgreen' : 'orange';
        checkBothReady(); // Check if game should start
    });

    ui.p2.readyBtn.addEventListener('click', () => {
        p2Ready = !p2Ready; // Toggle ready state
        ui.p2.readyBtn.textContent = p2Ready ? 'Cancel Ready' : 'Player 2 Ready';
        ui.p2.readyStatus.textContent = p2Ready ? 'Ready!' : 'Not Ready';
        ui.p2.readyStatus.style.color = p2Ready ? 'lightgreen' : 'orange';
        checkBothReady(); // Check if game should start
    });
}

function hideGameOverScreen() {
    // 使用我们之前定义的 ui 引用来获取元素
    if (ui.gameOver) {
        ui.gameOver.style.display = 'none';
    }
}

// --- Game Management ---

function initGame() {
    console.log("Initializing game...");
    gameOver = false;
    winner = null;
    particles = []; // Clear particles from previous game
    ui.gameOver.style.display = 'none'; // Hide game over screen
    gameStartTime = Date.now();

    // Reset safe zone
    safeZoneCenter = { x: canvas.width / 2, y: canvas.height / 2 };
    safeZoneRadius = Math.sqrt((canvas.width ** 2 + canvas.height ** 2)) / 2; // Initial radius covers canvas

    // Create player robots
    const padding = 100; // Initial distance from edge
    players = [
        new Robot(padding, canvas.height / 2, 'red', 1),
        new Robot(canvas.width - padding, canvas.height / 2, 'blue', 2, 'l') // P2 uses 'l' key
    ];

    // Reset UI elements to initial state
    players.forEach(p => {
        p.updateHpIndicator();
        p.updateChargeIndicator(0);
    });
    ui.timer.textContent = `Time Left: ${Math.ceil(config.zone.totalGameTime / MS_PER_SECOND)}s`;
    ui.shrinkTimer.textContent = `Shrink In: ${Math.ceil(config.zone.shrinkStartTime / MS_PER_SECOND)}s`;


    // Cancel any previous game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    setupInputListeners(); // Make sure input listeners are active for the new game
    gameLoop(); // Start the main game loop
}

function endGame(winningPlayer) {
    if (gameOver) return; // Prevent function running multiple times if called rapidly

    gameOver = true;
    winner = winningPlayer;
    cancelAnimationFrame(animationFrameId); // Stop the game loop
    animationFrameId = null;

    // Log result and update UI message
    if (winner) {
        console.log(`Game Over! Player ${winner.id} wins!`);
        ui.winnerMessage.textContent = `Player ${winner.id} (${winner.color}) wins!`;
    } else {
        console.log("Game Over! It's a draw!");
        ui.winnerMessage.textContent = `It's a Draw!`;
    }
    ui.gameOver.style.display = 'block'; // Show game over screen

    // Stop any ongoing player actions (like charging)
    players.forEach(p => {
        p.isCharging = false;
        p.isDashing = false; // Stop dashing visually/logically
        p.dashVelX = 0;
        p.dashVelY = 0;
        p.updateChargeIndicator(0); // Reset charge bars
        p.isControlDown = false; // Prevent accidental charge buffering on game end
    });

    // Reset ready state for rematch
    resetReadyState();
    ui.readyContainer.style.display = 'block'; // Show ready container again
}

function resetReadyState() {
    p1Ready = false;
    p2Ready = false;
    ui.p1.readyBtn.disabled = false;
    ui.p2.readyBtn.disabled = false;
    ui.p1.readyBtn.textContent = 'Player 1 Ready';
    ui.p2.readyBtn.textContent = 'Player 2 Ready';
    ui.p1.readyStatus.textContent = 'Not Ready';
    ui.p2.readyStatus.textContent = 'Not Ready';
    ui.p1.readyStatus.style.color = 'orange';
    ui.p2.readyStatus.style.color = 'orange';
}

// --- Background Effects ---

function generateStars(count, width, height) {
    const container = ui.starBackground;
    if (!container) return;
    container.innerHTML = ''; // Clear existing stars
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star'; // Use CSS for styling
        const size = Math.random() * 2 + 0.5; // Random size
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        // Random position within the container dimensions
        star.style.top = `${Math.random() * height}px`;
        star.style.left = `${Math.random() * width}px`;
        // Optional: Add random animation delays for twinkling effect via CSS
        // star.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(star);
    }
}

function setupStarfield() {
    // Function to update stars based on window size
    const updateStars = () => {
        // Use window dimensions for a full-screen background effect
        generateStars(200, window.innerWidth, window.innerHeight);
    };
    // Update stars when the window is resized
    window.addEventListener('resize', updateStars);
    // Generate initial stars
    updateStars();
}

// --- Initialization ---
function main() {
    console.log("Game script loaded. Setting up.");
    setupStarfield(); // Initialize background
    setupReadyButtons(); // Set up the ready system listeners
    resetReadyState(); // Ensure initial state is 'not ready'
    ui.readyContainer.style.display = 'block'; // Show the ready container initially
    ui.gameOver.style.display = 'none'; // Hide game over screen initially

    // The game will start via checkBothReady() when both players click their ready buttons.
    // initGame(); // DO NOT start the game immediately anymore.
}

// Run the main setup function when the script loads
main();
