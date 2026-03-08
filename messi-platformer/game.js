// ============================================================
// MESSI PLATFORMER - Juego de Plataformas 2D estilo Mario Bros
// Temática: Fútbol Argentino
// Stack: Vanilla JS + HTML5 Canvas
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const CANVAS_W = 960;
const CANVAS_H = 540;
const TILE = 40; // base tile size
const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const PLAYER_SPEED = 4.2;
const PLAYER_ACCEL = 0.35;
const PLAYER_FRICTION = 0.82;
const ENEMY_SPEED = 1.2;
const COIN_BOB_SPEED = 0.06;
const COIN_BOB_AMP = 4;
const CAMERA_LERP = 0.1;
const STOMP_BOUNCE = -7;
const INVINCIBLE_TIME = 90; // frames
const MAX_LIVES = 3;

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// --- Input ---
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; e.preventDefault(); });

// --- Utility ---
function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ============================================================
// SPRITE DRAWING HELPERS (geometric placeholders)
// Replace these functions with sprite image draws later.
// ============================================================

function drawMessi(x, y, w, h, facing, frame, jumping) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    if (facing < 0) ctx.scale(-1, 1);

    // Body - Argentina jersey (celeste y blanca stripes)
    const stripeW = w / 6;
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#75AADB' : '#FFFFFF';
        ctx.fillRect(-w / 2 + i * stripeW, h * 0.2, stripeW, h * 0.4);
    }

    // Shorts (dark blue)
    ctx.fillStyle = '#1C2C4A';
    ctx.fillRect(-w / 2 + 2, h * 0.6, w - 4, h * 0.2);

    // Legs
    const legOffset = jumping ? 4 : Math.sin(frame * 0.3) * 4;
    ctx.fillStyle = '#E8C39E';
    ctx.fillRect(-w / 2 + 4, h * 0.78, w * 0.3, h * 0.22);
    ctx.fillRect(w * 0.15, h * 0.78 + legOffset, w * 0.3, h * 0.22 - legOffset);

    // Shoes (black)
    ctx.fillStyle = '#222';
    ctx.fillRect(-w / 2 + 4, h - 4, w * 0.3, 4);
    ctx.fillRect(w * 0.15, h - 4, w * 0.3, 4);

    // Head
    ctx.fillStyle = '#E8C39E';
    ctx.beginPath();
    ctx.arc(0, h * 0.15, w * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Hair (dark)
    ctx.fillStyle = '#2A1A0A';
    ctx.beginPath();
    ctx.arc(0, h * 0.1, w * 0.33, Math.PI, Math.PI * 2);
    ctx.fill();
    // Long hair sides
    ctx.fillRect(-w * 0.33, h * 0.05, w * 0.12, h * 0.18);
    ctx.fillRect(w * 0.21, h * 0.05, w * 0.12, h * 0.18);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(-w * 0.14, h * 0.12, 3, 3);
    ctx.fillRect(w * 0.08, h * 0.12, 3, 3);

    // Beard
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(-w * 0.18, h * 0.22, w * 0.36, 3);

    // Number 10 on back
    ctx.fillStyle = '#1C2C4A';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('10', 0, h * 0.45);

    ctx.restore();
}

function drawEnemy(x, y, w, h, type, frame, alive) {
    ctx.save();
    ctx.translate(x, y);

    if (!alive) {
        ctx.globalAlpha = 0.5;
        ctx.translate(0, h * 0.5);
        ctx.scale(1, 0.3);
    }

    const colors = [
        { jersey1: '#009B3A', jersey2: '#FFDF00', shorts: '#1C4BA0' }, // Brasil
        { jersey1: '#002395', jersey2: '#FFFFFF', shorts: '#002395' }, // Francia
        { jersey1: '#FF6600', jersey2: '#000000', shorts: '#000000' }, // Holanda
    ];
    const c = colors[type % colors.length];

    // Body - rival jersey
    ctx.fillStyle = c.jersey1;
    ctx.fillRect(2, h * 0.25, w - 4, h * 0.35);
    // Stripe
    ctx.fillStyle = c.jersey2;
    ctx.fillRect(w * 0.3, h * 0.25, w * 0.4, h * 0.35);

    // Shorts
    ctx.fillStyle = c.shorts;
    ctx.fillRect(4, h * 0.6, w - 8, h * 0.18);

    // Legs walking
    const legOff = Math.sin(frame * 0.15) * 3;
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(6, h * 0.76, w * 0.28, h * 0.24);
    ctx.fillRect(w * 0.55, h * 0.76 + legOff, w * 0.28, h * 0.24 - legOff);

    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(6, h - 4, w * 0.28, 4);
    ctx.fillRect(w * 0.55, h - 4, w * 0.28, 4);

    // Head
    ctx.fillStyle = '#D4A574';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.18, w * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.13, w * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();

    // Angry eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(w * 0.35, h * 0.14, 3, 3);
    ctx.fillRect(w * 0.55, h * 0.14, 3, 3);
    // Angry eyebrows
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.1);
    ctx.lineTo(w * 0.43, h * 0.12);
    ctx.moveTo(w * 0.7, h * 0.1);
    ctx.lineTo(w * 0.57, h * 0.12);
    ctx.stroke();

    ctx.restore();
}

function drawCoin(x, y, r, frame) {
    const wobble = Math.sin(frame * 0.1) * 0.3 + 0.7;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(wobble, 1);

    // Outer
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Star / ball icon
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPlatform(x, y, w, h, type) {
    ctx.save();
    if (type === 'grass') {
        // Grass on top
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(x, y, w, 6);
        // Dark grass lines
        ctx.strokeStyle = '#388E3C';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 8) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i + 2, y - 3);
            ctx.stroke();
        }
        // Dirt
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(x, y + 6, w, h - 6);
        // Dirt texture
        ctx.fillStyle = '#795548';
        for (let bx = x; bx < x + w; bx += TILE) {
            for (let by = y + 8; by < y + h; by += TILE / 2) {
                ctx.fillRect(bx + 2, by, TILE - 4, TILE / 2 - 3);
            }
        }
    } else if (type === 'field') {
        // Football field platform - green stripes
        for (let i = 0; i < w; i += TILE) {
            ctx.fillStyle = (Math.floor(i / TILE) % 2 === 0) ? '#43A047' : '#66BB6A';
            ctx.fillRect(x + i, y, Math.min(TILE, w - i), h);
        }
        // White line markings
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Top edge
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(x, y, w, 3);
    } else if (type === 'brick') {
        // Brick blocks
        ctx.fillStyle = '#B0BEC5';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#78909C';
        ctx.lineWidth = 1;
        for (let bx = x; bx < x + w; bx += TILE) {
            for (let by = y; by < y + h; by += TILE / 2) {
                const offset = (Math.floor((by - y) / (TILE / 2)) % 2) * (TILE / 2);
                ctx.strokeRect(bx + offset, by, TILE, TILE / 2);
            }
        }
    } else if (type === 'goal') {
        // Goal post platform
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, w, h);
        // Net pattern
        ctx.strokeStyle = '#BDBDBD';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 8) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i, y + h);
            ctx.stroke();
        }
        for (let j = 0; j < h; j += 8) {
            ctx.beginPath();
            ctx.moveTo(x, y + j);
            ctx.lineTo(x + w, y + j);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
class Particle {
    constructor(x, y, color, life) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.8) * 4;
        this.color = color;
        this.life = life || 30;
        this.maxLife = this.life;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life--;
    }
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// ============================================================
// CLASSES
// ============================================================

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
    follow(target, levelWidth) {
        const targetX = target.x + target.w / 2 - CANVAS_W / 2;
        this.x += (targetX - this.x) * CAMERA_LERP;
        this.x = clamp(this.x, 0, Math.max(0, levelWidth - CANVAS_W));
        this.y = 0;
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 28;
        this.h = 44;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.facing = 1; // 1 right, -1 left
        this.frame = 0;
        this.jumping = false;
        this.lives = MAX_LIVES;
        this.score = 0;
        this.coins = 0;
        this.invincible = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.spawnX = x;
        this.spawnY = y;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;
    }

    update(platforms) {
        if (this.dead) {
            this.deathTimer++;
            this.vy += GRAVITY * 0.5;
            this.y += this.vy;
            return;
        }

        if (this.invincible > 0) this.invincible--;

        // Horizontal input
        let inputX = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) inputX = -1;
        if (keys['ArrowRight'] || keys['KeyD']) inputX = 1;

        if (inputX !== 0) {
            this.vx += inputX * PLAYER_ACCEL;
            this.vx = clamp(this.vx, -PLAYER_SPEED, PLAYER_SPEED);
            this.facing = inputX;
        } else {
            this.vx *= PLAYER_FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Jump buffer
        if (keys['Space'] || keys['ArrowUp'] || keys['KeyW']) {
            this.jumpBuffer = 6;
        } else {
            if (this.jumpBuffer > 0) this.jumpBuffer--;
        }

        // Coyote time
        if (this.onGround) {
            this.coyoteTime = 6;
        } else {
            if (this.coyoteTime > 0) this.coyoteTime--;
        }

        // Jump
        if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
            this.vy = JUMP_FORCE;
            this.jumping = true;
            this.onGround = false;
            this.jumpBuffer = 0;
            this.coyoteTime = 0;
        }

        // Variable jump height
        if (this.jumping && this.vy < 0 && !(keys['Space'] || keys['ArrowUp'] || keys['KeyW'])) {
            this.vy *= 0.6;
            this.jumping = false;
        }

        // Gravity
        this.vy += GRAVITY;
        if (this.vy > 12) this.vy = 12; // terminal velocity

        // Move X
        this.x += this.vx;
        this.onGround = false;

        // Collide X
        for (const p of platforms) {
            if (rectOverlap(this, p)) {
                if (this.vx > 0) {
                    this.x = p.x - this.w;
                } else if (this.vx < 0) {
                    this.x = p.x + p.w;
                }
                this.vx = 0;
            }
        }

        // Move Y
        this.y += this.vy;

        // Collide Y
        for (const p of platforms) {
            if (rectOverlap(this, p)) {
                if (this.vy > 0) {
                    this.y = p.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                    this.jumping = false;
                } else if (this.vy < 0) {
                    this.y = p.y + p.h;
                    this.vy = 0;
                }
            }
        }

        // Animation frame
        if (Math.abs(this.vx) > 0.5) {
            this.frame++;
        } else {
            this.frame = 0;
        }

        // Clamp to level left edge
        if (this.x < 0) { this.x = 0; this.vx = 0; }
    }

    draw(camX) {
        if (this.dead && this.deathTimer > 60) return;
        if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2 === 0) return;

        const sx = this.x - camX;
        drawMessi(sx, this.y, this.w, this.h, this.facing, this.frame, !this.onGround);
    }

    hurt() {
        if (this.invincible > 0 || this.dead) return;
        this.lives--;
        if (this.lives <= 0) {
            this.die();
        } else {
            this.invincible = INVINCIBLE_TIME;
        }
    }

    die() {
        this.dead = true;
        this.vy = -8;
        this.vx = 0;
        this.deathTimer = 0;
    }

    respawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.invincible = INVINCIBLE_TIME;
        this.onGround = false;
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

class Enemy {
    constructor(x, y, type, rangeLeft, rangeRight) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 42;
        this.vx = -ENEMY_SPEED;
        this.type = type || 0;
        this.alive = true;
        this.frame = 0;
        this.deathTimer = 0;
        this.rangeLeft = rangeLeft;
        this.rangeRight = rangeRight;
    }

    update(platforms) {
        if (!this.alive) {
            this.deathTimer++;
            return;
        }

        this.frame++;
        this.x += this.vx;

        // Patrol boundaries
        if (this.rangeLeft !== undefined && this.x <= this.rangeLeft) {
            this.x = this.rangeLeft;
            this.vx = ENEMY_SPEED;
        }
        if (this.rangeRight !== undefined && this.x + this.w >= this.rangeRight) {
            this.x = this.rangeRight - this.w;
            this.vx = -ENEMY_SPEED;
        }

        // Platform edge detection - turn around
        if (platforms) {
            let onPlatform = false;
            const footX = this.vx > 0 ? this.x + this.w : this.x;
            const footProbe = { x: footX - 2, y: this.y + this.h, w: 4, h: 4 };
            for (const p of platforms) {
                if (rectOverlap(footProbe, p)) {
                    onPlatform = true;
                    break;
                }
            }
            if (!onPlatform) {
                this.vx *= -1;
                this.x += this.vx * 2;
            }
        }
    }

    draw(camX) {
        if (!this.alive && this.deathTimer > 30) return;
        const sx = this.x - camX;
        drawEnemy(sx, this.y, this.w, this.h, this.type, this.frame, this.alive);
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    stomp() {
        this.alive = false;
        this.deathTimer = 0;
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 10;
        this.collected = false;
        this.baseY = y;
        this.frame = Math.random() * 100;
    }

    update() {
        if (this.collected) return;
        this.frame++;
        this.y = this.baseY + Math.sin(this.frame * COIN_BOB_SPEED) * COIN_BOB_AMP;
    }

    draw(camX) {
        if (this.collected) return;
        drawCoin(this.x - camX, this.y, this.r, this.frame);
    }

    getRect() {
        return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    }
}

class FlagPole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 200;
        this.reached = false;
    }

    draw(camX) {
        const sx = this.x - camX;
        // Pole
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(sx, this.y, this.w, this.h);
        // Ball on top
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        // Flag
        if (!this.reached) {
            ctx.fillStyle = '#75AADB';
            ctx.beginPath();
            ctx.moveTo(sx + this.w, this.y + 10);
            ctx.lineTo(sx + this.w + 35, this.y + 25);
            ctx.lineTo(sx + this.w, this.y + 40);
            ctx.fill();
            // Sun on flag
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(sx + this.w + 17, this.y + 25, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getRect() {
        return { x: this.x - 5, y: this.y, w: this.w + 10, h: this.h };
    }
}

// ============================================================
// LEVEL BUILDER
// ============================================================

function buildLevel() {
    const platforms = [];
    const enemies = [];
    const coins = [];
    let flagPole = null;

    const T = TILE;
    const groundY = CANVAS_H - T * 2;

    // --- Ground sections ---
    // Section 1: Start area
    platforms.push({ x: 0, y: groundY, w: T * 18, h: T * 2, type: 'grass' });

    // Gap 1
    // Section 2
    platforms.push({ x: T * 20, y: groundY, w: T * 12, h: T * 2, type: 'grass' });

    // Section 3
    platforms.push({ x: T * 35, y: groundY, w: T * 20, h: T * 2, type: 'grass' });

    // Gap 2
    // Section 4
    platforms.push({ x: T * 58, y: groundY, w: T * 8, h: T * 2, type: 'grass' });

    // Section 5
    platforms.push({ x: T * 68, y: groundY, w: T * 25, h: T * 2, type: 'grass' });

    // Section 6 - final stretch
    platforms.push({ x: T * 96, y: groundY, w: T * 20, h: T * 2, type: 'grass' });

    // --- Floating platforms ---
    // Field-type floating platforms
    platforms.push({ x: T * 5, y: groundY - T * 3, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 10, y: groundY - T * 5, w: T * 4, h: T, type: 'field' });
    platforms.push({ x: T * 14, y: groundY - T * 3, w: T * 2, h: T, type: 'field' });

    // Stepping stones over gap 1
    platforms.push({ x: T * 18.5, y: groundY - T * 2, w: T * 1.5, h: T * 0.6, type: 'brick' });

    // Platforms around section 2
    platforms.push({ x: T * 22, y: groundY - T * 3.5, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 26, y: groundY - T * 5, w: T * 4, h: T, type: 'field' });
    platforms.push({ x: T * 28, y: groundY - T * 8, w: T * 2, h: T, type: 'brick' });

    // Staircase section
    platforms.push({ x: T * 36, y: groundY - T * 2, w: T * 2, h: T * 2, type: 'brick' });
    platforms.push({ x: T * 38, y: groundY - T * 4, w: T * 2, h: T * 4, type: 'brick' });
    platforms.push({ x: T * 40, y: groundY - T * 6, w: T * 2, h: T * 6, type: 'brick' });

    // High platforms section 3
    platforms.push({ x: T * 43, y: groundY - T * 5, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 47, y: groundY - T * 4, w: T * 2, h: T, type: 'field' });
    platforms.push({ x: T * 50, y: groundY - T * 6, w: T * 3, h: T, type: 'field' });

    // Over gap 2
    platforms.push({ x: T * 55.5, y: groundY - T * 3, w: T * 2, h: T * 0.6, type: 'brick' });

    // Section 4 platforms
    platforms.push({ x: T * 60, y: groundY - T * 3.5, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 63, y: groundY - T * 6, w: T * 2, h: T, type: 'field' });

    // Goal area platforms
    platforms.push({ x: T * 70, y: groundY - T * 3, w: T * 4, h: T, type: 'field' });
    platforms.push({ x: T * 75, y: groundY - T * 5, w: T * 3, h: T, type: 'field' });

    // Pipe-like obstacles (tall brick columns)
    platforms.push({ x: T * 80, y: groundY - T * 3, w: T * 2, h: T * 3, type: 'brick' });
    platforms.push({ x: T * 85, y: groundY - T * 4, w: T * 2, h: T * 4, type: 'brick' });

    // High secret platform
    platforms.push({ x: T * 82, y: groundY - T * 8, w: T * 3, h: T, type: 'goal' });

    // Final staircase to flagpole
    platforms.push({ x: T * 90, y: groundY - T * 2, w: T * 2, h: T * 2, type: 'brick' });
    platforms.push({ x: T * 92, y: groundY - T * 4, w: T * 2, h: T * 4, type: 'brick' });
    platforms.push({ x: T * 94, y: groundY - T * 6, w: T * 2, h: T * 6, type: 'brick' });

    // Final area
    platforms.push({ x: T * 100, y: groundY - T * 3, w: T * 5, h: T, type: 'goal' });

    // --- Enemies ---
    // Section 1 enemies
    enemies.push(new Enemy(T * 8, groundY - 42, 0, T * 5, T * 15));
    enemies.push(new Enemy(T * 13, groundY - 42, 1, T * 10, T * 17));

    // Section 2 enemies
    enemies.push(new Enemy(T * 23, groundY - 42, 2, T * 20, T * 31));
    enemies.push(new Enemy(T * 28, groundY - 42, 0, T * 25, T * 31));

    // On floating platform
    enemies.push(new Enemy(T * 26.5, groundY - T * 5 - 42, 1, T * 26, T * 30));

    // Section 3 enemies
    enemies.push(new Enemy(T * 38, groundY - 42, 2, T * 35, T * 54));
    enemies.push(new Enemy(T * 45, groundY - 42, 0, T * 35, T * 54));
    enemies.push(new Enemy(T * 50, groundY - 42, 1, T * 35, T * 54));

    // On staircase platform
    enemies.push(new Enemy(T * 43.5, groundY - T * 5 - 42, 2, T * 43, T * 46));

    // Section 4
    enemies.push(new Enemy(T * 60, groundY - 42, 0, T * 58, T * 66));

    // Section 5 - harder
    enemies.push(new Enemy(T * 70, groundY - 42, 1, T * 68, T * 78));
    enemies.push(new Enemy(T * 74, groundY - 42, 2, T * 68, T * 78));
    enemies.push(new Enemy(T * 78, groundY - 42, 0, T * 68, T * 80));
    enemies.push(new Enemy(T * 86, groundY - 42, 1, T * 83, T * 92));

    // Section 6
    enemies.push(new Enemy(T * 98, groundY - 42, 2, T * 96, T * 105));
    enemies.push(new Enemy(T * 102, groundY - 42, 0, T * 96, T * 112));

    // --- Coins ---
    // Section 1 coins
    coins.push(new Coin(T * 3, groundY - T * 1.5));
    coins.push(new Coin(T * 4, groundY - T * 1.5));
    coins.push(new Coin(T * 5, groundY - T * 1.5));
    coins.push(new Coin(T * 6, groundY - T * 4.5));
    coins.push(new Coin(T * 7, groundY - T * 4.5));
    coins.push(new Coin(T * 11, groundY - T * 6.5));
    coins.push(new Coin(T * 12, groundY - T * 6.5));

    // Floating platform coins
    coins.push(new Coin(T * 22.5, groundY - T * 5));
    coins.push(new Coin(T * 23.5, groundY - T * 5));
    coins.push(new Coin(T * 24, groundY - T * 5));

    // High coins
    coins.push(new Coin(T * 28.5, groundY - T * 9.5));
    coins.push(new Coin(T * 29.5, groundY - T * 9.5));

    // Staircase reward coins
    coins.push(new Coin(T * 41, groundY - T * 7.5));

    // Section 3 coins
    coins.push(new Coin(T * 44, groundY - T * 6.5));
    coins.push(new Coin(T * 45, groundY - T * 6.5));
    coins.push(new Coin(T * 51, groundY - T * 7.5));
    coins.push(new Coin(T * 52, groundY - T * 7.5));

    // Section 4 coins
    coins.push(new Coin(T * 61, groundY - T * 5));
    coins.push(new Coin(T * 62, groundY - T * 5));
    coins.push(new Coin(T * 64, groundY - T * 7.5));

    // Section 5 coins
    coins.push(new Coin(T * 71, groundY - T * 4.5));
    coins.push(new Coin(T * 72, groundY - T * 4.5));
    coins.push(new Coin(T * 76, groundY - T * 6.5));
    coins.push(new Coin(T * 77, groundY - T * 6.5));

    // Secret platform coins
    coins.push(new Coin(T * 83, groundY - T * 9.5));
    coins.push(new Coin(T * 84, groundY - T * 9.5));
    coins.push(new Coin(T * 84.5, groundY - T * 9.5));

    // Final section coins
    coins.push(new Coin(T * 97, groundY - T * 1.5));
    coins.push(new Coin(T * 98, groundY - T * 1.5));
    coins.push(new Coin(T * 101, groundY - T * 4.5));
    coins.push(new Coin(T * 102, groundY - T * 4.5));
    coins.push(new Coin(T * 103, groundY - T * 4.5));

    // Flag pole at the end
    flagPole = new FlagPole(T * 108, groundY - 200);

    const levelWidth = T * 116;

    return { platforms, enemies, coins, flagPole, levelWidth, groundY };
}

// ============================================================
// BACKGROUND DRAWING
// ============================================================

function drawBackground(camX) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#B5E3F5');
    grad.addColorStop(1, '#E8F5E9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sun
    const sunX = 750 - camX * 0.05;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, 70, 35, 0, Math.PI * 2);
    ctx.fill();
    // Sun face (Sol de Mayo style)
    ctx.fillStyle = '#FFA000';
    ctx.beginPath();
    ctx.arc(sunX, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, 70, 18, 0, Math.PI * 2);
    ctx.fill();
    // Sun rays
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const inner = 36;
        const outer = i % 2 === 0 ? 50 : 44;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * inner, 70 + Math.sin(angle) * inner);
        ctx.lineTo(sunX + Math.cos(angle) * outer, 70 + Math.sin(angle) * outer);
        ctx.stroke();
    }

    // Clouds (parallax)
    const clouds = [
        { x: 100, y: 50, w: 80 },
        { x: 400, y: 80, w: 100 },
        { x: 700, y: 40, w: 70 },
        { x: 1100, y: 60, w: 90 },
        { x: 1500, y: 45, w: 85 },
        { x: 2000, y: 70, w: 75 },
        { x: 2500, y: 55, w: 95 },
        { x: 3200, y: 65, w: 80 },
        { x: 3800, y: 45, w: 90 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const c of clouds) {
        const cx = c.x - camX * 0.15;
        // Wrap clouds
        const wx = ((cx % (CANVAS_W + 200)) + CANVAS_W + 200) % (CANVAS_W + 200) - 100;
        ctx.beginPath();
        ctx.arc(wx, c.y, c.w * 0.3, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.25, c.y - 8, c.w * 0.25, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.5, c.y, c.w * 0.35, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.35, c.y + 5, c.w * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Distant mountains (parallax)
    ctx.fillStyle = '#A5D6A7';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H * 0.75);
    for (let i = 0; i <= CANVAS_W; i += 80) {
        const mx = i - (camX * 0.08) % 80;
        ctx.lineTo(mx, CANVAS_H * 0.65 + Math.sin(i * 0.015) * 30 + Math.cos(i * 0.008) * 20);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.fill();

    // Near hills
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H * 0.82);
    for (let i = 0; i <= CANVAS_W; i += 60) {
        const mx = i - (camX * 0.2) % 60;
        ctx.lineTo(mx, CANVAS_H * 0.78 + Math.sin(i * 0.02 + 1) * 15);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.fill();

    // Stadium lights in background (far away)
    const lightPositions = [500, 1800, 3500];
    for (const lp of lightPositions) {
        const lx = lp - camX * 0.1;
        if (lx > -50 && lx < CANVAS_W + 50) {
            ctx.fillStyle = '#90A4AE';
            ctx.fillRect(lx, CANVAS_H * 0.45, 6, CANVAS_H * 0.35);
            ctx.fillStyle = '#CFD8DC';
            ctx.fillRect(lx - 8, CANVAS_H * 0.43, 22, 10);
            // Light glow
            ctx.fillStyle = 'rgba(255,255,200,0.15)';
            ctx.beginPath();
            ctx.moveTo(lx + 3, CANVAS_H * 0.45);
            ctx.lineTo(lx - 20, CANVAS_H * 0.75);
            ctx.lineTo(lx + 26, CANVAS_H * 0.75);
            ctx.fill();
        }
    }
}

// ============================================================
// HUD
// ============================================================

function drawHUD(player) {
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, 36);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px monospace';

    // Lives
    ctx.fillText('VIDAS: ', 15, 24);
    for (let i = 0; i < player.lives; i++) {
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        const hx = 90 + i * 22;
        ctx.arc(hx, 18, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6666';
        ctx.beginPath();
        ctx.arc(hx - 2, 16, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Score
    ctx.fillStyle = '#FFD700';
    ctx.fillText('PUNTOS: ' + player.score, 200, 24);

    // Coins
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(420, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(420, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText('x ' + player.coins, 432, 24);

    // Messi label
    ctx.fillStyle = '#75AADB';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MESSI WORLD CUP RUN', CANVAS_W - 15, 24);
    ctx.textAlign = 'left';
}

// ============================================================
// SCREENS
// ============================================================

function drawStartScreen(frame) {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#1a237e');
    grad.addColorStop(0.5, '#283593');
    grad.addColorStop(1, '#1565C0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = '#FFD700';
    const starPositions = [
        [200, 60], [350, 90], [550, 50], [700, 80], [150, 130],
        [450, 30], [800, 110], [100, 80], [650, 130], [300, 45],
    ];
    for (const [sx, sy] of starPositions) {
        const twinkle = Math.sin(frame * 0.05 + sx) * 0.3 + 0.7;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Three stars (World Cup)
    const starY = 120;
    for (let i = 0; i < 3; i++) {
        const sx = CANVAS_W / 2 - 60 + i * 60;
        drawStar(sx, starY, 15, '#FFD700');
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MESSI', CANVAS_W / 2, 200);
    ctx.fillStyle = '#75AADB';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('WORLD CUP RUN', CANVAS_W / 2, 240);

    // Messi placeholder
    drawMessi(CANVAS_W / 2 - 30, 270, 60, 96, 1, frame, false);

    // Instructions
    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('PRESIONÁ ENTER PARA JUGAR', CANVAS_W / 2, 420);
    }

    // Controls
    ctx.fillStyle = '#B0BEC5';
    ctx.font = '14px monospace';
    ctx.fillText('← → o A/D: Mover  |  ESPACIO o W: Saltar', CANVAS_W / 2, 470);
    ctx.fillText('Saltá sobre los rivales para derrotarlos', CANVAS_W / 2, 495);

    ctx.textAlign = 'left';
}

function drawStar(cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.fill();
}

function drawGameOverScreen(frame, score, coins) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 180);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.fillText('Puntos: ' + score, CANVAS_W / 2, 250);
    ctx.fillText('Monedas: ' + coins, CANVAS_W / 2, 290);

    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('PRESIONÁ ENTER PARA REINICIAR', CANVAS_W / 2, 380);
    }

    ctx.textAlign = 'left';
}

function drawWinScreen(frame, score, coins) {
    ctx.fillStyle = 'rgba(0,0,50,0.8)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center';

    // Confetti
    for (let i = 0; i < 30; i++) {
        const cx = (Math.sin(frame * 0.02 + i * 3) + 1) * CANVAS_W / 2;
        const cy = ((frame * 2 + i * 40) % (CANVAS_H + 20)) - 10;
        const colors = ['#75AADB', '#FFFFFF', '#FFD700', '#FF4444', '#4CAF50'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(cx, cy, 6, 6);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('¡CAMPEÓN DEL MUNDO!', CANVAS_W / 2, 160);

    // Stars
    for (let i = 0; i < 3; i++) {
        drawStar(CANVAS_W / 2 - 70 + i * 70, 210, 20, '#FFD700');
    }

    // Trophy
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(CANVAS_W / 2 - 20, 250, 40, 50);
    ctx.fillRect(CANVAS_W / 2 - 30, 245, 60, 15);
    ctx.fillRect(CANVAS_W / 2 - 10, 300, 20, 15);
    ctx.fillRect(CANVAS_W / 2 - 20, 315, 40, 8);
    // Handles
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 - 30, 265, 12, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 + 30, 265, 12, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.fillText('Puntos: ' + score, CANVAS_W / 2, 370);
    ctx.fillText('Monedas: ' + coins, CANVAS_W / 2, 400);

    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#75AADB';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('PRESIONÁ ENTER PARA JUGAR DE NUEVO', CANVAS_W / 2, 460);
    }

    ctx.textAlign = 'left';
}

// ============================================================
// GAME STATE MACHINE
// ============================================================

const STATE = {
    START: 0,
    PLAYING: 1,
    GAME_OVER: 2,
    WIN: 3,
};

let gameState = STATE.START;
let globalFrame = 0;
let player, camera, level, particles;
let enterPressed = false;

function initGame() {
    level = buildLevel();
    player = new Player(TILE * 2, level.groundY - 50);
    camera = new Camera();
    particles = [];
    gameState = STATE.PLAYING;
}

// Track Enter key edge
window.addEventListener('keydown', e => {
    if (e.code === 'Enter') enterPressed = true;
});

// ============================================================
// MAIN GAME LOOP
// ============================================================

function gameLoop() {
    globalFrame++;

    switch (gameState) {
        case STATE.START:
            updateStartScreen();
            break;
        case STATE.PLAYING:
            updatePlaying();
            break;
        case STATE.GAME_OVER:
            updateGameOver();
            break;
        case STATE.WIN:
            updateWin();
            break;
    }

    enterPressed = false;
    requestAnimationFrame(gameLoop);
}

function updateStartScreen() {
    drawStartScreen(globalFrame);
    if (enterPressed) {
        initGame();
    }
}

function updatePlaying() {
    // --- Update ---
    player.update(level.platforms);

    // Update enemies
    for (const e of level.enemies) {
        e.update(level.platforms);
    }

    // Update coins
    for (const c of level.coins) {
        c.update();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // --- Collision: Player vs Enemies ---
    if (!player.dead) {
        for (const e of level.enemies) {
            if (!e.alive) continue;
            const pr = player.getRect();
            const er = e.getRect();
            if (rectOverlap(pr, er)) {
                // Check if stomping (player falling and feet above enemy mid)
                if (player.vy > 0 && pr.y + pr.h - 8 < er.y + er.h * 0.5) {
                    e.stomp();
                    player.vy = STOMP_BOUNCE;
                    player.score += 100;
                    player.jumping = true;
                    // Particles
                    for (let i = 0; i < 8; i++) {
                        particles.push(new Particle(
                            e.x + e.w / 2, e.y + e.h / 2,
                            ['#FFD700', '#FF4444', '#FFA500'][i % 3], 25
                        ));
                    }
                } else {
                    player.hurt();
                    if (player.dead) {
                        // Death particles
                        for (let i = 0; i < 12; i++) {
                            particles.push(new Particle(
                                player.x + player.w / 2, player.y + player.h / 2,
                                '#FF4444', 40
                            ));
                        }
                    }
                }
            }
        }
    }

    // --- Collision: Player vs Coins ---
    if (!player.dead) {
        for (const c of level.coins) {
            if (c.collected) continue;
            const pr = player.getRect();
            if (rectOverlap(pr, c.getRect())) {
                c.collected = true;
                player.coins++;
                player.score += 50;
                // Sparkle particles
                for (let i = 0; i < 6; i++) {
                    particles.push(new Particle(c.x, c.y, '#FFD700', 20));
                }
            }
        }
    }

    // --- Collision: Player vs FlagPole ---
    if (!player.dead && level.flagPole && !level.flagPole.reached) {
        if (rectOverlap(player.getRect(), level.flagPole.getRect())) {
            level.flagPole.reached = true;
            player.score += 1000;
            gameState = STATE.WIN;
        }
    }

    // --- Fall death ---
    if (player.y > CANVAS_H + 100) {
        if (!player.dead) {
            player.lives--;
            if (player.lives <= 0) {
                player.dead = true;
                gameState = STATE.GAME_OVER;
            } else {
                player.respawn();
            }
        } else {
            gameState = STATE.GAME_OVER;
        }
    }

    // --- Death timeout ---
    if (player.dead && player.deathTimer > 120) {
        gameState = STATE.GAME_OVER;
    }

    // --- Camera ---
    camera.follow(player, level.levelWidth);

    // --- Draw ---
    drawBackground(camera.x);

    ctx.save();

    // Draw platforms
    for (const p of level.platforms) {
        const sx = p.x - camera.x;
        if (sx + p.w > 0 && sx < CANVAS_W) {
            drawPlatform(sx, p.y, p.w, p.h, p.type);
        }
    }

    // Draw flag pole
    if (level.flagPole) {
        level.flagPole.draw(camera.x);
    }

    // Draw coins
    for (const c of level.coins) {
        const sx = c.x - camera.x;
        if (sx > -20 && sx < CANVAS_W + 20) {
            c.draw(camera.x);
        }
    }

    // Draw enemies
    for (const e of level.enemies) {
        const sx = e.x - camera.x;
        if (sx > -50 && sx < CANVAS_W + 50) {
            e.draw(camera.x);
        }
    }

    // Draw player
    player.draw(camera.x);

    // Draw particles
    ctx.save();
    ctx.translate(-camera.x, 0);
    for (const p of particles) {
        p.draw();
    }
    ctx.restore();

    ctx.restore();

    // HUD
    drawHUD(player);
}

function updateGameOver() {
    // Keep drawing the game scene behind
    drawBackground(camera.x);
    for (const p of level.platforms) {
        const sx = p.x - camera.x;
        if (sx + p.w > 0 && sx < CANVAS_W) drawPlatform(sx, p.y, p.w, p.h, p.type);
    }
    drawGameOverScreen(globalFrame, player.score, player.coins);
    if (enterPressed) {
        initGame();
    }
}

function updateWin() {
    drawWinScreen(globalFrame, player.score, player.coins);
    if (enterPressed) {
        initGame();
    }
}

// --- Start ---
requestAnimationFrame(gameLoop);
