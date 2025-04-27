<script>
    import {onMount} from 'svelte'
    import ReadyBox from "./lib/ReadyBox.svelte";
    import ChargeBar from "./lib/ChargeBar.svelte";
    import Icon from '@iconify/svelte';
    import RobotIcon from './assets/icons/RobotIcon.svg';

    let canvas;
    let ctx;

    /**
     * @fileoverview Main script for a 2-player physics-based arena game.
     * Players control robots, charge up dashes, and knock each other out
     * while a safe zone shrinks.
     */

    const assetDomain = 'https://assets.dashbot.jianong.me'
    // const assetDomain = ''
    // Load UFO image resources
    const redUfoImage = new Image();
    redUfoImage.src = assetDomain + '/assets/we.png';
    const blueUfoImage = new Image();
    blueUfoImage.src = assetDomain + '/assets/we222.png';
    const bgmAudio = new Audio(assetDomain + '/voices/0427_c.mp3');
    bgmAudio.loop = true;
    const hitAudio = new Audio(assetDomain + '/voices/hit_voice.mp3');

    const chargeAudio = {
        1: new Audio(assetDomain + '/voices/charge_voice.mp3'),
        2: new Audio(assetDomain + '/voices/charge_voice.mp3'),
    }

    const releaseAudio = {
        1: new Audio(assetDomain + '/voices/release2.mp3'),
        2: new Audio(assetDomain + '/voices/release2.mp3'),
    }

    // --- Constants ---
    const MS_PER_SECOND = 1000;
    const FRAMES_PER_SECOND = 60; // Assumed frame rate for dt calculations
    const KNOCKBACK_DURATION_FRAMES = 20; // How many frames knockback effect lasts
    let lastPosSync = 0, lastAngleSync = 0, lastChargeSync = 0;
    let lastFrameTime = performance.now();
    let isRemoteMode = false; // toggle this to false for local play
    let isHighRefreshRate = false;
    let p1ChargeRate = 0
    let p2ChargeRate = 0
    let enableVoice = true;

    // --- Game Configuration ---
    // Centralized settings for game balance and mechanics
    const config = {
        robot: {
            radius: 20,
            maxHp: 100,
            pointerLength: 30,
            angleSpeed: 0.03 * FRAMES_PER_SECOND, // Radians per frame (how fast the pointer spins)
            angleSpeedFast: 0.05 * FRAMES_PER_SECOND,
            pointerShowsDashDirection: true, // true = pointer shows MOVEMENT direction, false = pointer shows FACING/POOP direction
            hitFlashFrames: 5, // Number of flashes on hit
            hitFlashIntervalMs: 50, // Duration of each flash
            // 新增：圆环指针配置
            pointerRing: {
                normal: {
                    numBars: 36,              // 圆环包含的竖条数量 (越多越平滑)
                    baseRadiusOffset: 3,      // 圆环基线距离机器人边缘的距离
                    baseBarHeight: 6,         // 竖条的基础（最小）高度
                    maxPointerHeightBoost: 11,// 指向方向的竖条最大额外高度
                    waveAmplitude: 2,         // 基础波动的振幅（高度变化）
                    waveSpeed: 0.005,         // 波动动画的速度 (rad/ms)
                    waveSpatialFrequency: 6,  // 空间频率，影响同时有多少波峰波谷
                    pointerFocusExponent: 60, // 指针高亮区域的聚焦程度（值越大，高亮区域越窄）
                    barWidth: 2,              // 每个竖条的线宽
                },
                charged: {
                    numBars: 42,
                    baseRadiusOffset: 5,
                    baseBarHeight: 10,
                    maxPointerHeightBoost: 20,
                    waveAmplitude: 6,
                    waveSpeed: 0.01,
                    waveSpatialFrequency: 12,
                    pointerFocusExponent: 150,
                    barWidth: 4,
                },
                color: {
                    red: {
                        baseColor: 'rgba(153,14,252,0.9)', // 竖条的基础颜色
                        highlightColor: 'rgba(153,14,252,0.9)' // 指针方向竖条的高亮颜色
                    },
                    blue: {
                        baseColor: 'rgba(5,223,114,0.9)', // 竖条的基础颜色
                        highlightColor: 'rgba(5,223,114,0.9)' // 指针方向竖条的高亮颜色
                    }
                }
            },
        },
        charge: {
            barWidth: 2,              // 每个竖条的线宽
            minPower: 0.2, // Minimum dash power proportion (0 to 1)
            maxPower: 1.0, // Maximum dash power proportion
            minDamage: 20, // Damage dealt at minimum charge
            maxDamage: 60, // Damage dealt at maximum charge
            maxChargeTime: 1000, // milliseconds to reach max charge
        },
        dash: {
            baseSpeed: 25 * FRAMES_PER_SECOND, // Speed units per frame at max charge power
            knockbackForce: 100, // Base strength of knockback effect
            minSpeedThreshold: 0.5 * FRAMES_PER_SECOND, // Speed below which a dash ends
        },
        friction: 0.90, // Multiplier applied to dash velocity each frame (e.g., 0.9 means 10% speed loss)
        zone: {
            totalGameTime: 90000, // ms, total duration of a match
            shrinkStartTime: 30000, // ms, when the safe zone starts shrinking
            shrinkDuration: 8000, // ms, how long the shrinking process takes
            minRadius: 100, // Smallest radius the safe zone will reach
            damagePerTickOutside: 10, // <--- CORRECTED CALCULATION
            visual: {
                outerMaskColor: 'rgba(50,0,4,0.5)',
                grid: {
                    spacing: 20,
                    color: 'rgba(255,0,0,0.08)',
                    lineWidth: 1,
                },
                glow: {
                    baseWidth: 4,
                    pulseRange: 2,
                    pulseSpeed: 0.005,
                    innerAlpha: 0.2,
                    outerAlpha: 1.0,
                },
                edgeParticles: {
                    count: 20,
                    radius: 2,
                    color: 'rgba(225,37,37,0.6)',
                    rotationSpeedNormal: 0.0001,   // ← 缩圈前/后速度
                    rotationSpeedFast: 0.0012,    // ← 缩圈中速度
                },
                shockwave: {
                    duration: 1000,
                    maxRadiusBoost: 30,
                    color: 'rgb(152,19,19, ALPHA)',
                    lineWidth: 5,
                },
                hudText: {
                    shrinkSoon: {text: '⚠ Safe Zone Shrinking Soon', color: 'orange'},
                    shrinking: {text: '⚠ Shrinking...', color: 'red'},
                    closed: {text: '☢ Danger Outside Zone', color: 'darkred'},
                },
                lightning: {
                    enabled: false,
                    color: 'rgba(255,0,0,0.4)',
                    count: 3,           // 每帧画几道闪电
                    segments: 20,       // 每道闪电多少段
                    wiggle: 12,         // 最大扰动幅度
                    width: 1.5,         // 闪电线宽
                },
                outerLightning: {
                    enabled: false,
                    color: 'rgba(255,0,0,0,0.3)',
                    lineWidth: 2,
                    count: 1,
                    maxSegments: 10,
                    maxOffset: 25,
                    lifespan: 400, // 每道闪电持续时间（ms）
                },
                radiantLightning: {
                    enabled: true,
                    count: 2,                  // 同时几道放射性闪电
                    maxLength: 500,            // 每道最大长度
                    segmentLength: 30,         // 每段闪电的长度
                    forkChance: 0.3,           // 每段有概率分叉
                    maxForkDepth: 2,           // 最多生成一次子闪电
                    color: 'rgba(200,0,0,ALPHA)', // 注意这里用 ALPHA 占位符
                    lineWidth: 1.5,
                    lifespan: 1600,
                    lineWidthStart: 1.5,
                    lineWidthEnd: 0.2, // 闪电尖端越细
                    extraFlashChance: 0.2,  // ← 有 20% 概率闪得更久
                    alphaStages: [
                        {t: 0.0, alpha: 0.9},   // 初始闪亮
                        {t: 0.2, alpha: 0.6},   // 闪一下暗
                        {t: 0.4, alpha: 1},   // 再闪一下亮
                        {t: 1.0, alpha: 0.0},   // 最终消失
                    ],
                }
            },
        },
        particle: {
            maxCount: 300, // Max number of poop particles
            baseLife: 50, // Base frames a particle lives
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
    let gameStartTimeNormal; // Timestamp when the current game started
    let p1Ready = false; // Player 1 ready status
    let p2Ready = false; // Player 2 ready status

    let lightningBolts = [];
    let radiantBolts = [];
    let lastSyncTime = 0;
    let lastRadiantLightningTime = 0; // 放在全局定义

    let ui = {};

    let showMenu = true;
    let showGameOver = false;
    let winMessage = '';
    let localScore = {}
    let lobbyCount = 0
    let roomCount = 0
    let roomInfo = {}
    let isPlaying = false;
    let ShrinkingState = 'safe'; //shrinking/closed
    let ShrinkingLeft = 90; //shrinking/closed

    $: formattedTime = formatTime(ShrinkingLeft);

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    class NetworkAdapter {
        constructor() {
            this.playerId = null;
            this.roomId = null;
            this.state = {};
            this.readyStates = {};
            this.setupWebSocket();
        }

        setupWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const host = window.location.hostname;
            const port = window.location.hostname === 'localhost' ? '8080' : '443';
            this.ws = new WebSocket(`${protocol}://${host}:${port}/ws`);
            this.ws.onopen = () => console.log('Connected to server');
            this.ws.onmessage = (msg) => this.handleMessage(JSON.parse(msg.data));
        }

        handleMessage({type, data}) {
            switch (type) {
                case 'joined':
                    this.playerId = data.playerId;
                    this.roomId = data.roomId;
                    console.log("network.roomId =", network.roomId);
                    console.log("network.playerId =", network.playerId);
                    break;
                case 'ready_update':
                    this.readyStates = data.readyStatus;
                    p1Ready = !!this.readyStates[1];
                    p2Ready = !!this.readyStates[2];
                    break;
                case 'game_start':
                    initGame();
                    checkBothReady();
                    break;
                case 'end_game':

                    isPlaying = false;
                    endGame(players.find(p => p.id === data.winner))
                    break;

                case 'collision':
                    handleCollision(players[0], players[1]);
                    break;
                case 'charge_start':
                    // 收到对手开始蓄力
                    if (data.playerId !== this.playerId) {
                        const opp = players.find(p => p.id === data.playerId);
                        opp.isCharging = true;
                        opp.chargeStartTime = data.timestamp;
                        opp.updateChargeIndicator(0);
                    }
                    break;
                case 'charge_release':
                    if (players.length === 2 && data.playerId !== this.playerId) {
                        const opponent = players.find(p => p.id !== this.playerId);
                        opponent.angle = data.angle;
                        opponent.chargePower = data.chargePower;
                        opponent.dashDamage = data.dashDamage;
                        opponent.isCharging = false;
                        opponent.chargeStartTime = 0;

                        const dashSpeed = config.dash.baseSpeed * opponent.chargePower;
                        const dashAngle = opponent.angle + Math.PI;
                        opponent.dashVelX = Math.cos(dashAngle) * dashSpeed;
                        opponent.dashVelY = Math.sin(dashAngle) * dashSpeed;
                        opponent.isDashing = true;
                        opponent.updateChargeIndicator(0);
                    }
                    break;
                case 'sync':
                    Object.entries(data).forEach(([pid, state]) => {
                        const id = Number(pid);
                        if (id === network.playerId) return;
                        const p = players[id - 1];
                        if (!p) return;

                        if (typeof state.x === 'number') p.targetX = state.x;
                        if (typeof state.y === 'number') p.targetY = state.y;
                        if (typeof state.angle === 'number') p.targetAngle = state.angle;

                        // 正确同步速度和冲刺状态
                        if (typeof state.dashVelX === 'number') p.dashVelX = state.dashVelX;
                        if (typeof state.dashVelY === 'number') p.dashVelY = state.dashVelY;
                        if (typeof state.isDashing === 'boolean') p.isDashing = state.isDashing;
                    });
                    break;
                case 'hp_update':
                    const p = players[data.targetId - 1];
                    if (p) {
                        p.hp = data.hp;
                        p.updateHpIndicator();
                        if (data.amount > 0) {
                            p.triggerHitEffect();
                            // 不再在这里 applyKnockback，避免延迟的二次击退动画
                        }
                    }
                    break;
                case 'lobby_info':
                    lobbyCount = data.lobbyCount
                    roomCount = data.roomCount
                    break;
                case 'room_update':
                    roomInfo = data.room
                    console.log('update roomInfor', data.room)

                    p1Ready = !!roomInfo.readyStatus[1]
                    p2Ready = !!roomInfo.readyStatus[2]
                    break;
            }
        }

        send(type, data) {
            if (!isRemoteMode) return;
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({type, data}));
            }
        }

        setReady(isReady) {
            if (!isRemoteMode) {
                if (this.playerId === 1) p1Ready = isReady;
                if (this.playerId === 2) p2Ready = isReady;
                return;
            }
            this.send('ready', {isReady});
        }

        updateState(player) {
            const state = {
                x: player.x,
                y: player.y,
                angle: player.angle,
                // hp: player.hp,
                dashVelX: player.dashVelX,
                dashVelY: player.dashVelY,
                isDashing: player.isDashing
            };
            this.send('state', state);
        }

        broadcastChargeRelease(player) {
            this.send('charge_release', {
                playerId: player.id,
                angle: player.angle,
                chargePower: player.chargePower,
                dashDamage: player.dashDamage
            });
        }

        broadcastDamage(target, amount, fromX, fromY, knockbackMult) {
            this.send('damage', {
                targetId: target.id,
                amount,
                fromX,
                fromY,
                knockbackMult // 新增击退系数
            });
        }

        broadcastZoneDamage(target, amount) {
            this.send('zone_damage', {
                targetId: target.id,
                amount,
            });
        }
    }

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

            // ↓ 新增
            this.targetX = this.x;
            this.targetY = this.y;
            this.targetAngle = this.angle;

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
            this.isKnockback = false;
            this.skipSyncFrames = 0;    // 新增：跳过插值的帧数
            this.chargeRatio = 0;    // 新增：跳过插值的帧数
        }

        // --- Actions ---

        startCharge() {
            // Can only start charging if not already charging AND not currently dashing
            if (!this.isCharging && !this.isDashing) {
                playChargeAudio(this.id)
                this.isCharging = true;
                this.chargeStartTime = Date.now();
                this.chargePower = 0; // Reset power at start
                this.dashDamage = 0; // ← 这一行是关键，避免旧伤害残留
                if (this.id === network.playerId) {
                    network.send('charge_start', {playerId: this.id, timestamp: this.chargeStartTime});
                }
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
            console.log(`Player ${this.id} took ${damage.toFixed(2)} damage.`);

            this.updateHpIndicator(); // ← 加在这！

            // Apply Knockback only if NOT currently dashing (prevents weird self-interaction in head-ons)
            // and if damage was actually dealt (relevant for zone damage with 0 knockback)
            if (!this.isDashing && damage > 0 && knockbackForceMultiplier > 0) {
                // Calculate direction away from the source of damage
                const dx = this.x - knockbackSourceX;
                const dy = this.y - knockbackSourceY;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero
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

        // —— 修改 applyKnockback 方法 ——
        applyKnockback(dirX, dirY, distance) {
            this.isKnockback = true;              // 开始击退
            let frame = 0;
            const initialSpeed = distance / KNOCKBACK_DURATION_FRAMES * 2;

            const knockbackInterval = setInterval(() => {
                const progress = frame / KNOCKBACK_DURATION_FRAMES;
                const speed = initialSpeed * (1 - progress);

                this.x += dirX * speed;
                this.y += dirY * speed;

                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

                frame++;
                if (frame >= KNOCKBACK_DURATION_FRAMES) {
                    clearInterval(knockbackInterval);
                    this.isKnockback = false;      // 结束击退
                }
            }, MS_PER_SECOND / FRAMES_PER_SECOND);
        }

        triggerHitEffect() {
            const currentTime = Date.now();
            // 如果冷却时间未到，则不触发新效果
            if (currentTime - this.lastHitEffectTime < this.hitEffectCooldown) {
                return;
            }
            this.lastHitEffectTime = currentTime;

            // 原有闪烁逻辑
            this.hitOverlayAlpha = 1;
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

        update(dt) {
            // Rotate facing angle (pointer) if not dashing
            if (!this.isDashing) {
                const zone = config.zone;
                const t = Date.now() - gameStartTime;
                const shrinkStart = zone.shrinkStartTime;
                const shrinkEnd = shrinkStart + zone.shrinkDuration;
                let shrinkProgress = 0;
                if (t > shrinkStart) {
                    shrinkProgress = Math.min(1, (t - shrinkStart) / zone.shrinkDuration);
                }

                // 现在 angleSpeed/angleSpeedFast 当作 “rad/s” 用
                const angularSpeed = config.robot.angleSpeed +
                    (config.robot.angleSpeedFast - config.robot.angleSpeed) * shrinkProgress;
                this.angle = (this.angle + angularSpeed * dt) % (Math.PI * 2);
                this.imageAngle = (this.imageAngle + angularSpeed * 0.4 * dt) % (Math.PI * 2);
            }

            // Update charge power visual if charging
            if (this.isCharging) {
                const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
                const chargeRatio = chargeDuration / config.charge.maxChargeTime;
                this.updateChargeIndicator(chargeRatio * 100); // UI expects percentage
            }

            // —— 新逻辑 ——
            // 所有玩家：如果在冲刺中，就用物理更新位置
            if (this.isDashing) {
                this.updateDashMovement(dt);
            }
            // 仅对手：如果不在冲刺，则用插值平滑同步位置和角度
            // 只在网络模式下才做插值
            if (isRemoteMode && this.id !== network.playerId && !this.isDashing && !this.isKnockback) {
                if (this.skipSyncFrames > 0) {
                    this.skipSyncFrames--;
                } else {
                    const α = 0.1;
                    this.x += (this.targetX - this.x) * α;
                    this.y += (this.targetY - this.y) * α;
                    let δ = this.targetAngle - this.angle;
                    δ = ((δ + Math.PI) % (2 * Math.PI)) - Math.PI;
                    this.angle += δ * α;
                }
            }

        }

        updateDashMovement(dt) {
            // 位置
            this.x += this.dashVelX * dt;
            this.y += this.dashVelY * dt;
            // 边界
            this._handleBoundaryReflection();
            // friction: 以前 config.friction 每帧，这里做指数衰减
            const f = Math.pow(config.friction, dt * FRAMES_PER_SECOND);
            this.dashVelX *= f;
            this.dashVelY *= f;
            // 粒子
            this._createDashParticles(dt);
            // 结束检测（速度还是单位/秒无变化）
            const speed = Math.hypot(this.dashVelX, this.dashVelY);
            if (speed < config.dash.minSpeedThreshold) this._endDash();
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

        _createDashParticles(dt) {
            const currentSpeed = Math.sqrt(this.dashVelX ** 2 + this.dashVelY ** 2);
            // More particles generated at higher speeds
            const particleCount = Math.floor((currentSpeed * dt) / 5);

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
                    text: getRandomCodeChar(),
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
            if (this.id === 1) {
                p1ChargeRate = percentage;
            } else {
                p2ChargeRate = percentage;
            }

            this.chargeRatio = percentage
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
            if (!ringConfig) return;

            const currentTime = Date.now();
            let displayAngle = config.robot.pointerShowsDashDirection ? (this.angle + Math.PI) : this.angle;
            displayAngle = (displayAngle + Math.PI * 2) % (Math.PI * 2);

            // 颜色处理
            const baseColor = ringConfig.color[this.originalColor].baseColor;
            const highlightColor = ringConfig.color[this.originalColor].highlightColor;
            const baseColorRGBA = parseRGBA(baseColor);
            const highlightColorRGBA = parseRGBA(highlightColor);

            const baseRingRadius = this.radius + ringConfig.normal.baseRadiusOffset;

            // 蓄力进度
            let chargeProgress = 0;
            if (this.isCharging) {
                const chargeDuration = Math.min(currentTime - this.chargeStartTime, config.charge.maxChargeTime);
                chargeProgress = chargeDuration / config.charge.maxChargeTime;
            }

            // 插值函数
            const lerpParam = (key) => {
                const from = ringConfig.normal[key];
                const to = ringConfig.charged[key];
                return from + (to - from) * chargeProgress;
            };

            // 动态参数
            const dynamicBarWidth = lerpParam('barWidth');
            const dynamicWaveAmplitude = lerpParam('waveAmplitude');
            const dynamicWaveSpeed = lerpParam('waveSpeed');
            const dynamicWaveSpatialFrequency = lerpParam('waveSpatialFrequency');
            const dynamicNumBars = Math.round(lerpParam('numBars'));
            const dynamicMaxPointerHeightBoost = lerpParam('maxPointerHeightBoost');
            const dynamicPointerFocusExponent = lerpParam('pointerFocusExponent');

            // 绘制竖条
            for (let i = 0; i < dynamicNumBars; i++) {
                const barAngle = (i / dynamicNumBars) * Math.PI * 2;

                const startX = this.x + Math.cos(barAngle) * baseRingRadius;
                const startY = this.y + Math.sin(barAngle) * baseRingRadius;

                let angleDiff = Math.abs(barAngle - displayAngle);
                angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                const targetHeightFactor = Math.pow(Math.cos(Math.min(angleDiff, Math.PI / 2)), dynamicPointerFocusExponent);

                const waveOffset = Math.sin(currentTime * dynamicWaveSpeed + barAngle * dynamicWaveSpatialFrequency) * dynamicWaveAmplitude;

                const barHeight = ringConfig.normal.baseBarHeight + targetHeightFactor * dynamicMaxPointerHeightBoost + waveOffset;
                const finalBarHeight = Math.max(0, barHeight);

                const endX = this.x + Math.cos(barAngle) * (baseRingRadius + finalBarHeight);
                const endY = this.y + Math.sin(barAngle) * (baseRingRadius + finalBarHeight);

                const barColor = lerpColor(baseColorRGBA, highlightColorRGBA, targetHeightFactor);

                ctx.strokeStyle = barColor;
                ctx.lineWidth = dynamicBarWidth;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }

    const network = new NetworkAdapter();

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


    // --- Collision Detection & Handling ---

    // game.js - 修改checkCollisions函数
    function checkCollisions() {
        if (players.length < 2) return;
        const [p1, p2] = players;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.radius + p2.radius;
        if (distSq >= minDist * minDist) return;

        // 本地先处理一次碰撞
        handleCollision(p1, p2);

        // 如果是远程模式，让主机再广播一次
        if (isRemoteMode && network.playerId === 1) {
            network.send('collision', {});
        }
    }

    function playBgmAudio() {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
        bgmAudio.play();
    }

    function playHitAudio() {
        hitAudio.currentTime = 0.1;
        hitAudio.play();
    }

    function playChargeAudio(playerId) {
        chargeAudio[playerId].currentTime = 0;
        chargeAudio[playerId].play();
    }

    function playReleaseAudio(playerId) {
        chargeAudio[playerId].currentTime = 0;
        chargeAudio[playerId].pause();

        releaseAudio[playerId].currentTime = 0;
        releaseAudio[playerId].play();
    }

    // 新增统一碰撞处理
    // game.js – handleCollision 中，确保“撞人者”立刻同步位置，避免后续插值漂移
    function handleCollision(p1, p2) {
        const p1Dashing = p1.isDashing && !p2.isDashing;
        const p2Dashing = !p1.isDashing && p2.isDashing;
        const bothDashing = p1.isDashing && p2.isDashing;

        if (!isRemoteMode) {
            if (p1Dashing) {
                p2.takeDamage(p1.dashDamage, p1.x, p1.y);
                playHitAudio()
                // —— 新增：立即同步撞人者 p1 的位置和朝向 ——
                p1.targetX = p1.x;
                p1.targetY = p1.y;
                p1.targetAngle = p1.angle;

                p1._endDash();
            } else if (p2Dashing) {
                p1.takeDamage(p2.dashDamage, p2.x, p2.y);
                playHitAudio()
                // —— 新增：立即同步撞人者 p2 的位置和朝向 ——
                p2.targetX = p2.x;
                p2.targetY = p2.y;
                p2.targetAngle = p2.angle;

                p2._endDash();
            } else if (bothDashing) {
                // —— 双方互相伤害 ——
                p1.takeDamage(p2.dashDamage, p2.x, p2.y);
                p2.takeDamage(p1.dashDamage, p1.x, p1.y);
                playHitAudio()

                p1.targetX = p1.x;
                p1.targetY = p1.y;
                p1.targetAngle = p1.angle;
                p2.targetX = p2.x;
                p2.targetY = p2.y;
                p2.targetAngle = p2.angle;

                p1._endDash();
                p2._endDash();
            }
            return;
        }

        // 网络模式同理
        if (p1Dashing) {
            p2.takeDamage(p1.dashDamage, p1.x, p1.y);
            playHitAudio()
            p1.targetX = p1.x;
            p1.targetY = p1.y;
            p1.targetAngle = p1.angle;
            if (network.playerId === 1) {
                network.broadcastDamage(p2, p1.dashDamage, p1.x, p1.y, 1);
            }
            p1._endDash();
            // p1.skipSyncFrames = 3;    // 撞人者连续 3 帧不做网络插值

        } else if (p2Dashing) {
            p1.takeDamage(p2.dashDamage, p2.x, p2.y);
            playHitAudio()
            p2.targetX = p2.x;
            p2.targetY = p2.y;
            p2.targetAngle = p2.angle;
            if (network.playerId === 1) {
                network.broadcastDamage(p1, p2.dashDamage, p2.x, p2.y, 1);
            }
            p2._endDash();
            // p2.skipSyncFrames = 3;
        } else if (bothDashing) {
            p1.takeDamage(p2.dashDamage, p2.x, p2.y);
            p2.takeDamage(p1.dashDamage, p1.x, p1.y);
            playHitAudio()

            p1.targetX = p1.x;
            p1.targetY = p1.y;
            p1.targetAngle = p1.angle;
            p2.targetX = p2.x;
            p2.targetY = p2.y;
            p2.targetAngle = p2.angle;

            if (network.playerId === 1) {
                network.broadcastDamage(p1, p2.dashDamage, p2.x, p2.y, 1);
                network.broadcastDamage(p2, p1.dashDamage, p1.x, p1.y, 1);
            }

            p1._endDash();
            p2._endDash();
        }
    }

    function stopDash(player) {
        player.isDashing = false;
        player.dashVelX = player.dashVelY = 0;
        player.dashDamage = 0;
    }

    function resolveDeath(p1, p2) {
        if (p1.hp <= 0 && p2.hp <= 0) endGame(null);
        else if (p1.hp <= 0) endGame(p2);
        else if (p2.hp <= 0) endGame(p1);
    }


    function detectRefreshRate(callback) {
        let frames = 0;
        let start = performance.now();

        function measure(now) {
            frames++;
            if (now - start < 500) {
                requestAnimationFrame(measure);
            } else {
                const fps = (frames / (now - start)) * 1000;
                callback(fps);
            }
        }

        requestAnimationFrame(measure);
    }

    // --- Game Loop ---

    function gameLoop(timestamp) {
        if (gameOver) return; // Stop the loop if game has ended


        const frameDuration = 1000 / FRAMES_PER_SECOND;
        const delta = timestamp - lastFrameTime;
        if (isHighRefreshRate && delta < frameDuration) return requestAnimationFrame(gameLoop);

        const dt = delta / 1000;
        lastFrameTime = timestamp;

        const elapsedMs = timestamp - gameStartTime;  // ← 这里就是 elapsedMs

        // --- Updates ---
        updateSafeZone(elapsedMs);
        updateTimers(elapsedMs);
        updatePlayers(dt);
        applyZoneDamage(dt); // Apply damage *after* player position update
        checkCollisions(); // Check collisions *after* updates
        updateParticles(dt); // Update particle positions and life

        // --- Drawing ---
        clearCanvas();
        drawSafeZone();
        drawParticles();
        drawPlayers();
        updateLightningBolts();
        updateRadiantLightning();
        drawRadiantLightning();    // ← 每道闪电都重绘，而且带 alpha

        // Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- Game Loop Helper Functions ---


    function updateRadiantLightning() {
        const cfg = config.zone.visual.radiantLightning;
        const now = Date.now();

        // 清理旧闪电
        radiantBolts = radiantBolts.filter(b => now - b.spawnTime < cfg.lifespan);

        // 控制刷新间隔：0.3~1秒之间波动
        if (now - lastRadiantLightningTime > 1500 + Math.random() * 3500) {
            lastRadiantLightningTime = now;

            const angle = Math.random() * Math.PI * 2;
            const startDist = Math.max(canvas.width, canvas.height) * 0.7 + Math.random() * 100;
            const startX = safeZoneCenter.x + Math.cos(angle) * startDist;
            const startY = safeZoneCenter.y + Math.sin(angle) * startDist;

            radiantBolts.push({
                spawnTime: now,
                segments: generateLightningPath(startX, startY, angle, 0, cfg),
                useExtraFlash: Math.random() < cfg.extraFlashChance // ← 标记是否用闪光节奏
            });
        }
    }

    function generateLightningPath(x, y, targetAngle, depth, cfg) {
        const segments = [];
        const len = cfg.maxLength * (depth === 0 ? 1 : 0.5); // 分叉更短
        const segLen = cfg.segmentLength;
        const steps = Math.floor(len / segLen);

        for (let i = 0; i < steps; i++) {
            const bend = (Math.random() - 0.5) * 0.6; // 微弯
            const angle = targetAngle + bend;

            const dx = -Math.cos(angle) * segLen;
            const dy = -Math.sin(angle) * segLen;
            const nx = x + dx;
            const ny = y + dy;

            segments.push({x1: x, y1: y, x2: nx, y2: ny});

            if (depth < cfg.maxForkDepth && Math.random() < cfg.forkChance) {
                const forkAngle = angle + (Math.random() - 0.5) * 1.4; // 分叉角度大
                segments.push(...generateLightningPath(nx, ny, forkAngle, depth + 1, cfg));
            }

            x = nx;
            y = ny;

            const dxToCenter = nx - safeZoneCenter.x;
            const dyToCenter = ny - safeZoneCenter.y;
            const distSq = dxToCenter * dxToCenter + dyToCenter * dyToCenter;
            if (distSq < safeZoneRadius * safeZoneRadius) break;
        }

        return segments;
    }

    function drawRadiantLightning() {
        const now = Date.now();
        const cfg = config.zone.visual.radiantLightning;
        const stages = radiantBolts?.useExtraFlash ? cfg.alphaStages : [
            {t: 0.0, alpha: 1.0},
            {t: 1.0, alpha: 0.0}
        ];

        radiantBolts.forEach(bolt => {
            const age = now - bolt.spawnTime;
            const t = Math.min(1, age / cfg.lifespan);

            // 找出当前时间区间
            let alpha = 0;
            for (let i = 0; i < stages.length - 1; i++) {
                const a = stages[i];
                const b = stages[i + 1];
                if (t >= a.t && t <= b.t) {
                    const localT = (t - a.t) / (b.t - a.t);
                    alpha = a.alpha + (b.alpha - a.alpha) * localT;
                    break;
                }
            }

            const strokeStyle = cfg.color.replace('ALPHA', alpha.toFixed(3));
            ctx.save();
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = cfg.lineWidth;
            // ctx.shadowColor = 'rgba(255,255,255,0.5)';
            // ctx.shadowBlur = 8;
            ctx.beginPath();
            bolt.segments.forEach((seg, idx) => {
                const ratio = idx / bolt.segments.length;
                const lw = cfg.lineWidthStart + (cfg.lineWidthEnd - cfg.lineWidthStart) * ratio;
                ctx.lineWidth = lw;
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            });
            ctx.stroke();
            ctx.restore();
        });
    }

    function updateLightningBolts() {
        const cfg = config.zone.visual.outerLightning;
        const now = Date.now();

        // 清理过期
        lightningBolts = lightningBolts.filter(bolt => now - bolt.spawnTime < cfg.lifespan);

        // 如果不足数量，补充
        while (lightningBolts.length < cfg.count) {
            const angle = Math.random() * Math.PI * 2;
            const distance = safeZoneRadius + 30 + Math.random() * 60;

            const startX = safeZoneCenter.x + Math.cos(angle) * distance;
            const startY = safeZoneCenter.y + Math.sin(angle) * distance;

            const dx = (Math.random() - 0.5) * 80;
            const dy = (Math.random() - 0.5) * 80;

            const endX = startX + dx;
            const endY = startY + dy;

            lightningBolts.push({
                startX,
                startY,
                endX,
                endY,
                spawnTime: now
            });
        }
    }

    function drawOuterLightningBolts() {
        const cfg = config.zone.visual.outerLightning;
        const now = Date.now();

        lightningBolts.forEach(bolt => {
            const progress = (now - bolt.spawnTime) / cfg.lifespan;
            const alpha = 1 - progress;

            const x1 = bolt.startX;
            const y1 = bolt.startY;
            const x2 = bolt.endX;
            const y2 = bolt.endY;

            const segments = cfg.maxSegments;
            const offset = cfg.maxOffset;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * offset;
                const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * offset;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(x2, y2);

            ctx.strokeStyle = cfg.color.replace(/[\d.]+\)$/, `${alpha.toFixed(2)})`);
            ctx.lineWidth = cfg.lineWidth;
            ctx.stroke();
        });
    }

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
        // ui.timer.textContent = `Time Left: ${secondsLeft}s`;
        ShrinkingLeft = secondsLeft

        // Update shrink countdown timer
        const shrinkRemaining = Math.max(0, config.zone.shrinkStartTime - elapsedMs);
        if (shrinkRemaining > 0) {
            const shrinkSeconds = Math.ceil(shrinkRemaining / MS_PER_SECOND);
            // ui.shrinkTimer.textContent = `Shrink In: ${shrinkSeconds}s`;
            ShrinkingState = 'safe'
        } else if (elapsedMs < config.zone.shrinkStartTime + config.zone.shrinkDuration) {
            // ui.shrinkTimer.textContent = 'Shrinking...';
            ShrinkingState = 'shrinking'
        } else {
            // ui.shrinkTimer.textContent = 'Zone Closed!';
            ShrinkingState = 'closed'
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

    function applyZoneDamage(dt) {
        players.forEach(player => {
            const dx = player.x - safeZoneCenter.x;
            const dy = player.y - safeZoneCenter.y;
            const isInside = dx * dx + dy * dy <= safeZoneRadius * safeZoneRadius;
            const wasInside = player.isInSafeZone;

            if (!isInside) {
                // 出圈后才开始扣血
                network.broadcastZoneDamage(player, config.zone.damagePerTickOutside * dt);
                player.takeDamage(config.zone.damagePerTickOutside * dt, player.x, player.y, 0);
                if (wasInside) player.isInSafeZone = false;  // 只第一次出圈时改
            } else {
                if (!wasInside) {
                    player.isInSafeZone = true;                // 只第一次进圈时改
                    console.log(`Player ${player.id} re-entered the safe zone.`);
                }
            }
            player.updateHpIndicator();
        });
    }

    function updateParticles(dt) {
        particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * FRAMES_PER_SECOND;     // 如果 life 单位改成秒，否则不改也行
        });
        particles = particles.filter(p => p.life > 0);
    }


    // --- Drawing Helper Functions ---

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawSafeZone() {
        const cx = safeZoneCenter.x;
        const cy = safeZoneCenter.y;
        const r = safeZoneRadius;
        const t = Date.now();

        const vis = config.zone.visual;
        const elapsedMs = t - gameStartTime;
        const shrinkStart = config.zone.shrinkStartTime;
        const shrinkEnd = shrinkStart + config.zone.shrinkDuration;

        // ① 圈外遮罩
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.rect(canvas.width, 0, -canvas.width, canvas.height);
        ctx.clip();
        ctx.fillStyle = vis.outerMaskColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // ② 网格
        drawOuterGridMask(cx, cy, r, vis.grid);

        // ③ 描边发光
        const pulse = 0.3 + 0.2 * Math.sin(t * vis.glow.pulseSpeed);
        const gradient = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r);
        gradient.addColorStop(0, `rgba(255,0,0,${pulse * vis.glow.innerAlpha})`);
        gradient.addColorStop(1, `rgb(140, 44, 47, ${pulse * vis.glow.outerAlpha})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = vis.glow.baseWidth + vis.glow.pulseRange * pulse;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        if (vis.lightning.enabled) {
            drawSafeZoneLightning(cx, cy, r, vis.lightning, t);
        }

        // ④ 圆周粒子
        const ep = vis.edgeParticles;
        const inShrinkPhase = elapsedMs >= shrinkStart && elapsedMs < shrinkEnd;
        const rotationSpeed = inShrinkPhase ? ep.rotationSpeedFast : ep.rotationSpeedNormal;

        for (let i = 0; i < ep.count; i++) {
            const angle = (t * rotationSpeed + i * (Math.PI * 2 / ep.count)) % (Math.PI * 2);
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.fillStyle = ep.color;
            ctx.arc(px, py, ep.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // ⑤ 缩圈冲击波
        if (elapsedMs > shrinkStart && elapsedMs < shrinkStart + vis.shockwave.duration) {
            const progress = (elapsedMs - shrinkStart) / vis.shockwave.duration;
            const shockRadius = r + vis.shockwave.maxRadiusBoost * (1 - progress);
            ctx.beginPath();
            ctx.strokeStyle = vis.shockwave.color.replace('ALPHA', (1 - progress).toFixed(2));
            ctx.lineWidth = vis.shockwave.lineWidth * (1 - progress);
            ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        const now = Date.now();
        const elapsedMsForHud = now - gameStartTimeNormal;

        const shrinkStartTimeHud = config.zone.shrinkStartTime;
        const shrinkEndTimeHud = shrinkStartTimeHud + config.zone.shrinkDuration;

        const showHudBeforeShrinkMs = 10000; // 缩圈前 10 秒提示

        const timeUntilShrinkStartsHud = shrinkStartTimeHud - elapsedMsForHud;

        const isBeforeShrinkHud = timeUntilShrinkStartsHud > showHudBeforeShrinkMs;
        const isShrinkSoonHud = timeUntilShrinkStartsHud <= showHudBeforeShrinkMs && timeUntilShrinkStartsHud > 0;
        const isShrinkingHud = elapsedMsForHud >= shrinkStartTimeHud && elapsedMsForHud < shrinkEndTimeHud;
        const isShrinkClosedHud = elapsedMsForHud >= shrinkEndTimeHud;

// ⑥ 顶部提示（完全隔离逻辑）
        if (isShrinkSoonHud) {
            const {text, color} = vis.hudText.shrinkSoon;
            drawHudText(text, canvas.width / 2, 70, color);
        } else if (isShrinkingHud) {
            const {text, color} = vis.hudText.shrinking;
            drawHudText(text, canvas.width / 2, 70, color);
        } else if (isShrinkClosedHud) {
            const {text, color} = vis.hudText.closed;
            drawHudText(text, canvas.width / 2, 70, color);
        }

        if (config.zone.visual.outerLightning.enabled) {
            drawOuterLightningBolts();
        }

        if (config.zone.visual.radiantLightning.enabled) {
            drawRadiantLightning();
        }
    }

    function drawSafeZoneLightning(cx, cy, r, lightningCfg, t) {
        for (let i = 0; i < lightningCfg.count; i++) {
            const startAngle = Math.random() * Math.PI * 2;
            const segmentAngle = (Math.PI * 2) / lightningCfg.segments;
            ctx.beginPath();

            for (let j = 0; j <= lightningCfg.segments; j++) {
                const angle = startAngle + j * segmentAngle;
                const noise = (Math.random() - 0.5) * lightningCfg.wiggle;
                const rr = r + noise;
                const x = cx + Math.cos(angle) * rr;
                const y = cy + Math.sin(angle) * rr;

                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = lightningCfg.color;
            ctx.lineWidth = lightningCfg.width;
            ctx.stroke();
        }
    }

    function drawOuterGridMask(cx, cy, r, gridCfg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.rect(canvas.width, 0, -canvas.width, canvas.height);
        ctx.clip();

        ctx.strokeStyle = gridCfg.color;
        ctx.lineWidth = gridCfg.lineWidth;
        for (let x = 0; x < canvas.width; x += gridCfg.spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridCfg.spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawHudText(text, x, y, color = 'white') {
        ctx.save();
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    const codeChars = [
        'alibaba', 'OSS', 'Redis', 'ACR', 'ECS',

        '01010101', '0', '1', 'nil', 'error', 'warining', 'def', 'shit', 'fuck', 'fuck you',
        'if', 'else', 'for', 'while', 'return', '=>', '==', '===', 'defer',
        'queue', 'devops', 'async', 'await', 'try', 'catch', 'import', 'export',
        'switch', 'case', 'class', 'enum', 'map', 'list', 'set', 'array', 'dict',
        'tuple', 'hook', 'JWT', '404', 'panic', 'k8s', 'docker', 'S3', 'VPC', 'todo',
        'hax', 'bug', 'lol', 'wtf', 'sudo', 'NaN', 'undefined', '=>',
        '0101', 'null', 'let', 'const', 'var', '&&', '||', 'func', '()', '[]',
        '#', '>', '<', '+', '-', '*', '/', '%', '!!true', '!!false',
        'PR', 'WIP', 'PTAL', 'TBR', 'TL;DR', 'LGTM', 'AFAIK', 'CC', 'nerd', 'geek',
        'YOLO', 'sudo !!', 'chmod 777', 'kill -9', 'ps aux', 'ls -la',
        'cd ..', 'cd /', 'make', 'make clean', 'touch', 'mv', 'cp', 'tar -xzvf',
        'ssh root@', 'exit 1', '0xDEADBEEF', 'segfault', 'core dumped',

        'git', 'CI/CD', 'localhost', '127.0.0.1', 'exit', 'kill', 'rm -rf',
        'ping', 'curl', 'grep', 'chmod', 'root', 'admin', 'pwned',
        'heap', 'stack', 'overflow', 'base64', 'md5', 'sha256', 'token',
        'auth', '.env', 'ERR', 'boot', 'reboot', 'exec',
        'socket', 'cors', 'cache', 'ttl', 'dns', 'async/await', 'yield',
        'bind', 'apply', 'call', 'loser', 'throttle', 'debounce', 'fork',
        'node_modules', 'hot', 'reload', 'dev', 'prod', 'test',
        'mock', 'stub', 'spy', 'assert', 'jest',
        'webpack', 'vite', 'tsconfig', 'jwt', 'csrf', 'xss', 'sqlinjection',
        'promise', 'reject', 'cloud', 'cdn', 'proxy',

        '0xBADF00D', '0xC0FFEE', '0xFEEDFACE', 'hello world', 'bye world',
        'killall', 'panic!!', 'why', 'pls', 'rekt', 'GG', 'nope', 'boom', 'pwn',
        'die()', 'sleep(9999)', 'while(true)', 'matrix', 'ctrl+c', 'ctrl+z',

        'undefined != NaN', 'true == false', 'ಠ_ಠ', '💩', '🐛', '🔥', '🚀',

        'Stuxnet', 'HelloWorld', 'Linux', 'GNU', 'BSD', 'TCP/IP', 'RFC 2616', 'RFC 2324',
        'fail whale', 'slashdot', 'diggnation', 'IE6', 'Musk', 'Satoshi',

        '(ಥ﹏ಥ)', '(¬_¬)', '(ಠ_ಠ)',
        '(；一_一)', '(≧▽≦)', '(๑•̀ㅂ•́)و✧', '(｡•́‿•̀｡)', 'ψ(｀∇´)ψ', '(ﾉ´ヮ`)ﾉ*: ･ﾟ',
        '( •̀ ω •́ )✧', '(눈_눈)', '｡ﾟ(ﾟ´Д｀)ﾟ｡', 'ಥ_ಥ', '(ʘ‿ʘ)', 'ʕ•ᴥ•ʔ', '(=￣ω￣=)',
        'ლ(╹◡╹ლ)', '(ง •̀_•́)ง', '(•‿•)', '(｡♥‿♥｡)', '^ ^'
    ];

    function getRandomCodeChar() {
        return codeChars[Math.floor(Math.random() * codeChars.length)];
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save(); // Save current context state
            ctx.translate(p.x, p.y); // Move origin to particle position
            ctx.rotate(p.rotation); // Rotate
            ctx.font = `${Math.max(1, 18)}px sans-serif`; // Use particle size, ensure minimum 1px
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Fade out particle based on remaining life
            ctx.globalAlpha = Math.max(0, p.life / (config.particle.baseLife + config.particle.randomLifeBoost)); // Fade based on max possible life
            ctx.fillStyle = '#00FFFF'; // Poop color
            ctx.fillText(p.text, 0, 0);
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
            if (roomInfo.id && network.playerId !== 1) {
                return;
            }

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
        if (showMenu && event.key.toLowerCase() === 'a') {
            markP1Ready()
        }
        if (showMenu && event.key.toLowerCase() === 'l') {
            markP2Ready()
        }

        if (!gameOver && players[1] && event.key.toLowerCase() === players[1].controlKey && !players[1].isControlDown) {
            if (roomInfo.id && network.playerId !== 2) {
                return;
            }

            // Check if game is running, P2 exists, key matches P2's control, and key wasn't already down
            players[1].isControlDown = true;
            players[1].startCharge(); // Attempt to start charge
        }
        if (!gameOver && players[0] && event.key.toLowerCase() === players[0].controlKey && !players[0].isControlDown) {
            if (roomInfo.id && network.playerId !== 1) {
                return;
            }
            // Check if game is running, P2 exists, key matches P2's control, and key wasn't already down
            players[0].isControlDown = true;
            players[0].startCharge(); // Attempt to start charge
        }
    }

    function handleKeyUp(event) {
        if (!gameOver && players[1] && event.key.toLowerCase() === players[1].controlKey) {
            if (roomInfo.id && network.playerId !== 2) {
                return;
            }
            // Check if game is running, P2 exists, key matches P2's control
            // Only release charge if the control was actually tracked as 'down' for P2
            if (players[1].isControlDown) {
                players[1].isControlDown = false;
                players[1].releaseCharge(); // Attempt to release charge
            }
        }

        if (!gameOver && players[0] && event.key.toLowerCase() === players[0].controlKey) {
            if (roomInfo.id && network.playerId !== 1) {
                return;
            }
            // Check if game is running, P2 exists, key matches P2's control
            // Only release charge if the control was actually tracked as 'down' for P2
            if (players[0].isControlDown) {
                players[0].isControlDown = false;
                players[0].releaseCharge(); // Attempt to release charge
            }
        }
    }

    // --- Ready System ---

    function checkBothReady() {
        if (roomInfo.id) {
            return;
        }
        if (p1Ready && p2Ready) {
            initGame(); // Start the game
        }
    }

    function hideGameOverScreen() {
        console.log('hide game over')
        showGameOver = false;
        showMenu = true;
    }

    function hideReadyBox() {
        showMenu = false;
    }

    function showReadyBox() {
        ui.readyContainer.style.display = 'flex';
        ui.ui.style.pointerEvents = 'auto';
    }

    // --- Game Management ---

    function initGame() {
        console.log("Initializing game...");
        playBgmAudio()

        gameOver = false;
        winner = null;
        particles = []; // Clear particles from previous game
        showGameOver = false;
        isPlaying = true;
        hideReadyBox()

        // Reset safe zone
        safeZoneCenter = {x: canvas.width / 2, y: canvas.height / 2};
        safeZoneRadius = Math.sqrt((canvas.width ** 2 + canvas.height ** 2)) / 2; // Initial radius covers canvas

        // Create player robots
        const padding = 100; // Initial distance from edge
        players = [
            new Robot(padding, canvas.height / 2, 'red', 1, 'a'),
            new Robot(canvas.width - padding, canvas.height / 2, 'blue', 2, 'l') // P2 uses 'l' key
        ];

        // Reset UI elements to initial state
        players.forEach(p => {
            p.updateHpIndicator();
            p.updateChargeIndicator(0);
        });
        // ui.timer.textContent = `Time Left: ${Math.ceil(config.zone.totalGameTime / MS_PER_SECOND)}s`;
        // ui.shrinkTimer.textContent = `Shrink In: ${Math.ceil(config.zone.shrinkStartTime / MS_PER_SECOND)}s`;


        // Cancel any previous game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        gameStartTime = performance.now();
        gameStartTimeNormal = Date.now();
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function endGame(winningPlayer) {
        if (gameOver) return; // Prevent function running multiple times if called rapidly

        if (roomInfo.id && isPlaying) {
            return;
        }

        gameOver = true;
        winner = winningPlayer;
        cancelAnimationFrame(animationFrameId); // Stop the game loop
        animationFrameId = null;
        isPlaying = false

        // Log result and update UI message
        if (winner) {
            localScore[winner.id] = (localScore[winner.id] || 0) + 1
            console.log(`Game Over! Player ${winner.id} wins!`, winner.id, localScore);
            winMessage = `Player ${winner.id} (${winner.color}) wins!`;
        } else {
            console.log("Game Over! It's a draw!");
            winMessage = `It's a Draw!`;
        }
        showGameOver = true;

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
    }

    function resetReadyState() {
        p1Ready = false;
        p2Ready = false;
        // ui.p1.readyBtn.disabled = false;
        // ui.p2.readyBtn.disabled = false;
        // todo
        // ui.p1.readyBtn.textContent = 'Player 1 Ready';
        // ui.p2.readyBtn.textContent = 'Player 2 Ready';
        // ui.p1.readyStatus.textContent = 'Not Ready';
        // ui.p2.readyStatus.textContent = 'Not Ready';
        // ui.p1.readyStatus.style.color = 'orange';
        // ui.p2.readyStatus.style.color = 'orange';
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
        detectRefreshRate((fps) => {
            console.log(`Detected FPS: ${fps.toFixed(1)}`);
            if (fps > 70) { // 高刷 > 60，留点余地
                isHighRefreshRate = true;
                // 特殊逻辑
                console.log('High refresh rate detected!');
            }
        });

        console.log("Game script loaded. Setting up.");
        setupInputListeners(); // Make sure input listeners are active for the new game
        setupStarfield(); // Initialize background
        setupReadyButtons(); // Set up the ready system listeners
        resetReadyState(); // Ensure initial state is 'not ready'

        // The game will start via checkBothReady() when both players click their ready buttons.
        // initGame(); // DO NOT start the game immediately anymore.
    }

    // ============================
    // Websocket
    // ============================
    /* --- NetworkAdapter Setup --- */

    /* --- Override Ready Buttons --- */

    function updateReadyUI() {
        ui.p1.readyStatus.textContent = p1Ready ? 'Ready!' : 'Not Ready';
        ui.p1.readyStatus.style.color = p1Ready ? 'lightgreen' : 'orange';
        ui.p2.readyStatus.textContent = p2Ready ? 'Ready!' : 'Not Ready';
        ui.p2.readyStatus.style.color = p2Ready ? 'lightgreen' : 'orange';
        ui.p1.readyBtn.textContent = p1Ready ? 'Cancel Ready' : 'Player 1 Ready';
        ui.p2.readyBtn.textContent = p2Ready ? 'Cancel Ready' : 'Player 2 Ready';
    }

    function setupReadyButtons() {
        // todo
        // ui.p1.readyBtn.addEventListener('click', () => {
        //     p1Ready = !p1Ready;
        //     network.setReady(p1Ready);
        //     updateReadyUI();
        // });
        //
        // ui.p2.readyBtn.addEventListener('click', () => {
        //     p2Ready = !p2Ready;
        //     network.setReady(p2Ready);
        //     updateReadyUI();
        // });
    }

    /* --- Sync inside game loop --- */

    function updatePlayers(dt) {
        const now = Date.now();
        players.forEach(p => {
            p.update(dt);
            if (p.id === network.playerId && now - lastSyncTime >= 20) {
                console.log('updatePlayer')
                network.updateState(p);
                lastSyncTime = now;
            }
        });
    }

    /* --- Hook into charge release --- */

    Robot.prototype.releaseCharge = function () {
        if (this.isCharging) {
            playReleaseAudio(this.id)

            this.isCharging = false;
            const chargeDuration = Math.min(Date.now() - this.chargeStartTime, config.charge.maxChargeTime);
            const chargeRatio = chargeDuration / config.charge.maxChargeTime;
            this.chargePower = config.charge.minPower + (config.charge.maxPower - config.charge.minPower) * Math.sqrt(chargeRatio);
            const dashSpeed = config.dash.baseSpeed * this.chargePower;
            this.dashDamage = config.charge.minDamage + (config.charge.maxDamage - config.charge.minDamage) * chargeRatio;
            const dashAngle = this.angle + Math.PI;
            this.dashVelX = Math.cos(dashAngle) * dashSpeed;
            this.dashVelY = Math.sin(dashAngle) * dashSpeed;
            this.isDashing = true;
            this.updateChargeIndicator(0);
            if (this.id === network.playerId) {
                network.broadcastChargeRelease(this);
            }
        }
    };

    onMount(() => {

        // --- Canvas & Rendering Context ---
        ctx = canvas.getContext('2d');
        // --- Helper Functions --- (可以放在文件顶部或 Robot 类外部)


        // --- UI Element References ---
        // Getting references to HTML elements for UI updates
        ui = {
            ui: document.getElementById('ui'),
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


        // Run the main setup function when the script loads
        main();

    })

    const markP1Ready = () => {
        if (!!roomInfo.id && network.playerId !== 1) {
            return
        }
        p1Ready = !p1Ready;
        checkBothReady();
        network.setReady(p1Ready);
    }

    const markP2Ready = () => {
        if (!!roomInfo.id && network.playerId !== 2) {
            return
        }
        p2Ready = !p2Ready;
        checkBothReady();
        network.setReady(p2Ready);
    }

    const startMatch = () => {
        console.log('start match')
        network.send('join_room');
    }

    const exitRoom = () => {
        network.send('leave_room');
        roomInfo = {}
    }

    const toggleVoice = () => {
        enableVoice = !enableVoice;

        const muted = !enableVoice

        bgmAudio.muted = muted
        hitAudio.muted = muted
        chargeAudio[1].muted = muted
        chargeAudio[2].muted = muted
        releaseAudio[1].muted = muted
        releaseAudio[2].muted = muted
    }

    $: poisonActive = ShrinkingState !== 'safe';

</script>

<main>

    <div id="star-background"></div>

    <h1 class="text-5xl md:text-7xl font-bold mb-2 text-purple-600 tracking-tight relative">
            <span class="relative flex justify-center items-center">
              DASH<span class="text-green-400">BOT</span>
                <img src={RobotIcon} width="70">
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </span>
    </h1>
    <p class="text-lg md:text-xl text-gray-400 flex items-center justify-center mt-3">
        <span class="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
        1v1 Space Robot Sprint Battle
        <span class="inline-block w-1.5 h-1.5 bg-green-500 rounded-full ml-2"></span>
    </p>

    <div class="flex justify-center my-6">
        <div class="text-center max-w-2xl relative px-4 py-2">
            <div class="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500"></div>
            <div class="absolute top-0 right-0 w-3 h-3 border-t border-r border-green-500"></div>
            <div class="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-500"></div>
            <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-green-500"></div>

            <div class="mx-1">
                <p class="font-bold text-yellow-400"> Press "A" or "L" to dash!</p>
                <p>Time your shots, predict your opponent's moves, and be the last bot standing!</p>
            </div>
        </div>
    </div>

<!--    <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-around;">-->
<!--        <div id="timer" class="timer-box">Time Left:</div>-->
<!--        <div id="shrink-timer" class="timer-box shrink">Shrink In:</div>-->
<!--    </div>-->

    <div class="flex justify-between items-center mb-2 pl-2 bg-black/30 border border-purple-800/30 rounded relative">
        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500"></div>
        <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
        <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>

        <div class="flex items-center gap-2 py-1">
            <div class="text-sm font-bold text-purple-500 flex items-center">
                {#if roomInfo.id}
                    ROOM:
                {:else}
                    Local Mode
                {/if}
            </div>
            {#if roomInfo.id}
                <div class="bg-purple-900/50 px-2 py-1 rounded text-sm border border-purple-800/50">{roomInfo.id}XXX
                </div>
            {/if}
        </div>

        <div class="flex items-center gap-3">

            <div
                    class={`flex items-center gap-1 px-2 py-1 rounded border ${poisonActive ? "bg-green-900/20 border-green-800/50" : "bg-black/40 border-gray-800/50"}`}
            >
                <div class={`text-xs font-bold ${poisonActive ? "text-green-400" : "text-gray-400"}`}>
                    {poisonActive ? "POISON ACTIVE" : "SAFE ZONE"}
                </div>
                <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>

            <div class="bg-black/40 px-2 py-1 rounded text-sm border border-gray-800/50 flex items-center gap-1">
                <!--                <ZapIcon class="h-3 w-3 text-yellow-500" />-->
                <Icon icon="ph:lightning" width="16" height="16" class="text-yellow-400"/>
                <div class="text-yellow-400">{formattedTime}</div>
            </div>

            <div onclick={toggleVoice} class="px-2 py-1 rounded cursor-pointer text-sm text-yellow-400 border border-yellow-800/50 flex items-center gap-1 hover:bg-yellow-900/50 pointer transform scale-x-[-1]" style="height:34px; width: 42px">
                <!--                <AlertTriangleIcon class="h-3 w-3 text-red-500" />-->
                {#if enableVoice}
                    <Icon icon="line-md:volume-high-twotone" width="24" height="24"/>
                {:else}
                    <Icon icon="line-md:volume-remove-twotone" width="24" height="24" />
                {/if}
            </div>
        </div>
    </div>
    <div id="game-container">
        <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500"></div>
        <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500"></div>
        <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500"></div>
        <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500"></div>


        <div id="ui" class:prevent-pointer={gameStartTime && !gameOver}>
            <div class="player-info flex justify-between items-start ">
                <div id="player1-info" class="flex flex-col items-start gap-1 text-purple-500">
                    <div class="flex">

                        <div class="bg-purple-900/50 flex mr-2 justify-center items-center px-2 rounded text-sm border border-purple-800/50">
                            <Icon icon="material-symbols:robot-2-outline-rounded" width="24" height="24"/>
                            P1
                        </div>

                        <div id="p1-hp">{ config.robot.maxHp }</div>
                        <div>&nbsp;HP</div>

                    </div>
                    <ChargeBar chargeLevel={p1ChargeRate / 100} totalSegments={30} color="purple"/>
                </div>

                <div id="player2-info" class="flex flex-col items-end gap-1 text-green-500">
                    <div class="flex">
                        <div id="p2-hp">{ config.robot.maxHp }</div>
                        <div>&nbsp;HP</div>

                        <div class="bg-green-900/50 flex ml-2 justify-center items-center px-2 rounded text-sm border border-green-800/50">
                            P2
                            <Icon icon="material-symbols:robot-2-outline-rounded" width="24" height="24"/>
                        </div>


                    </div>
                    <ChargeBar chargeLevel={p2ChargeRate / 100} totalSegments={30} color="green" reverse/>
                </div>
            </div>

            {#if showMenu && !roomInfo.id}
                <div id="menu" class="menu">
                    <div class="tab">
                        <button class="tab-item" onclick={() => isRemoteMode = false}>
                            {#if !isRemoteMode}
                                <div class="selected"></div>
                            {/if}
                            <span>Local Mode</span>
                        </button>
                        <button class="tab-item" onclick={() => isRemoteMode = true}>
                            {#if isRemoteMode}
                                <div class="selected"></div>
                            {/if}
                            <span>Online Mode</span>
                            <div class="online-status-pointer"></div>
                        </button>
                    </div>

                    {#if isRemoteMode}
                        <div class="online-menu">
                            <div class="counter" style="height: 275px;">
                                <div class="people-count">people: {lobbyCount}</div>
                                <div class="rooms-count">rooms: {roomCount}</div>
                            </div>
<!--                            <div class="rooms">-->
<!--                                <div class="room">room1</div>-->
<!--                                <div class="room">room2</div>-->
<!--                                <div class="room">room3</div>-->
<!--                                <div class="room">room4</div>-->
<!--                            </div>-->
                            <button class="start-match" onclick={startMatch}>Start match</button>
                        </div>
                    {:else}
                        <div class="local-menu">
                            <ReadyBox
                                    p1Score={localScore[1] || 0} p2Score={localScore[2] || 0}
                                    p1Ready={p1Ready}
                                    p2Ready={p2Ready}
                                    markP1Ready={markP1Ready}
                                    markP2Ready={markP2Ready}
                            ></ReadyBox>
                        </div>
                    {/if}

                </div>
            {/if}

            {#if roomInfo.id && !isPlaying}
                <div class="menu">
                    <div class="room-header">
                        <div class="left">
                            <div class="room-no">RoomID: {roomInfo.id}</div>
                            <div class="room-singnal">📶</div>
                        </div>
                        <buoon class="exit" onclick={exitRoom}>Exit room</buoon>
                    </div>
                    <div class="local-menu">
                        <ReadyBox p1Score={roomInfo.score[1] || 0} p2Score={roomInfo.score[2] || 0} p1Ready={p1Ready}
                                  p2Ready={p2Ready} markP1Ready={markP1Ready} markP2Ready={markP2Ready}
                                  isOnline={!!roomInfo.id} current={network.playerId}></ReadyBox>
                    </div>
                </div>
            {/if}


        </div>
        {#if showGameOver}
            <div id="game-over" class="absolute inset-0 z-5 flex flex-col items-center justify-center ">
                <div class="relative p-8 border-2 border-purple-800/70 rounded-lg bg-black/80 max-w-md w-full">
                    <div class="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500"></div>
                    <div class="absolute top-0 right-0 w-3 h-3 border-t border-r border-green-500"></div>
                    <div class="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-500"></div>
                    <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-green-500"></div>

                    <div class="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <!--                    <RobotIcon class="h-12 w-12 text-yellow-400" />-->
                    </div>

                    <h2 class="text-4xl font-bold mb-4 text-yellow-400 text-center">GAME OVER</h2>
                    <p class="text-2xl mb-6 text-center flex items-center justify-center">
                        <!--                    <RobotIcon className={`h-6 w-6 mr-2 ${winner === 0 ? "text-purple-500" : "text-green-400"}`} />-->
                        <Icon icon="material-symbols:robot-2-outline-rounded" width="32" height="32"/>

                        Player 1 Wins!
                    </p>

                    <div class="flex gap-4 justify-center">
                        <div class="border-green-800 text-green-400 hover:bg-green-900/50 p-2 rounded relative overflow-hidden">
                            <button onclick={hideGameOverScreen}>
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <canvas bind:this={canvas} id="gameCanvas" width="1000" height="600"></canvas>
    </div>
</main>

<style>
    body {
        display: flex;
        flex-direction: column; /* Stack title and game vertically */
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background-color: #1a1a2e; /* Dark space blue */
        color: #e0e0e0; /* Light text */
        font-family: sans-serif;
    }

    #game-container {
        position: relative; /* Needed for absolute positioning of UI elements */
        width: 100%; /* Match canvas width */
        height: 100%; /* Match canvas height */
        display: flex;
        justify-content: center;
        align-items: center;
    }

    canvas {
        border: 2px dashed #4a4a6a; /* 虚线边框 */
        display: block;
        background-color: transparent; /* 背景透明 */
    }

    #ui {
        width: 1000px;
        height: 600px;
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 1.1em;
        z-index: 5;
    }

    #ui.prevent-pointer {
        pointer-events: none;
    }

    .player-info {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        border-radius: 5px;
    }

    #player1-info, #player2-info {
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.5);
    }

    #player1-info {
        border-bottom-right-radius: 10px;
    }

    #player2-info {
        border-bottom-left-radius: 10px;
    }

    .charge-indicator {
        height: 5px;
        background-color: limegreen;
        width: 0%; /* Start with 0 width */
        margin-top: 3px;
        transition: width 0.1s linear; /* Smooth transition */
    }

    .game-over-screen {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(40, 40, 60, 0.9);
        padding: 30px;
        border: 2px solid #f0a500;
        border-radius: 10px;
        text-align: center;
        color: white;
        z-index: 5;
    }

    .game-over-screen h2 {
        margin-top: 0;
        color: #f0a500;
    }

    .game-over-screen button {
        padding: 10px 20px;
        font-size: 1em;
        cursor: pointer;
        margin-top: 15px;
        background-color: #f0a500;
        border: none;
        border-radius: 5px;
        color: #1a1a2e;
    }

    :global(.star) {
        position: absolute;
        background: white;
        border-radius: 50%;
        opacity: 0.8;
    }

    .timer-box {
        color: white;
        font-size: 1.2em;
        margin-bottom: 10px;
        padding: 10px;
    }

    .timer-box.shrink {
        color: #f88;
        font-size: 1em;
    }

    #p1-ready-status, #p2-ready-status {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px 10px;
        border-radius: 5px;
    }

    #p1-ready-btn, #p2-ready-btn {
        width: 120px;
    }

    body {
        font-family: 'JetBrains Mono', monospace;
        color: white;
    }

    :global(button) {
        background-color: rgba(255, 255, 255, 0.08);
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        all: unset; /* 干掉所有默认样式 */
        cursor: pointer; /* 加上手型 */
        outline: none;
        border: none;
    }

    :global(button):focus {
        outline: none;
    }

    :global(button):hover {
        background-color: rgba(255, 255, 255, 0.2);
    }

    #star-background {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        overflow: hidden;

        pointer-events: none;
        z-index: 1;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(ellipse at center, rgba(50, 0, 80, 0.2), transparent 70%);
    }

    .menu {
        width: 520px;
        position: absolute;
        display: flex;
        flex-direction: column;
        background: rgba(16, 16, 37, 0.5);
        border: 1px dashed rgba(168, 168, 168, 0.5);
    }

    .menu .tab {
        display: flex;
        width: 100%;
        gap: 2px;
    }

    .menu .tab .tab-item {
        width: 100%;
        display: flex;
        justify-content: start;
        align-items: center;
        background: #4a4a6a;
        cursor: pointer;
        height: 60px;
        position: relative;
        padding: 0 10px;
    }

    .menu .tab .tab-item:hover {
        background: #9393de;
    }

    .menu .tab .tab-item .selected {
        height: 5px;
        width: 100%;
        background-color: rgb(88, 225, 150);
        position: absolute;
        left: 0;
        top: 0;
    }

    .menu .tab .tab-item .online-status-pointer {
        width: 8px;
        height: 8px;
        background-color: rgb(88, 225, 150);
        border-radius: 50%;
        margin-left: 5px;
    }

    .menu .online-menu {
        margin-top: 30px;
    }

    .menu .online-menu > div:not(:last-of-type) {
        margin-bottom: 30px;
    }

    .menu .online-menu .counter {
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 0 24px;
    }

    .menu .online-menu .rooms {
        display: flex;
        padding: 3rem;
    }

    .menu .online-menu .start-match {
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        font-size: 1.2em;
        background-color: #5e4a6a;
        padding: 20px 0;
        cursor: pointer;
        width: 100%;
    }

    .menu .online-menu .start-match:hover {
        background-color: #8f67a8;
    }

    .menu .local-menu {
        padding: 24px;

    }

    .room-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .room-header:hover {
    }

    .room-header .left {
        display: flex;
        padding-left: 20px;
    }

    .room-header .exit {
        font-weight: bold;
        cursor: pointer;
        padding: 20px;
    }

    .room-header .exit:hover {
        background-color: rgba(91, 26, 76, 0.5);
    }

</style>
