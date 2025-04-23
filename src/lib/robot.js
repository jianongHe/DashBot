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
    }

    // --- Actions ---

    startCharge() {
        // Can only start charging if not already charging AND not currently dashing
        if (!this.isCharging && !this.isDashing) {
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