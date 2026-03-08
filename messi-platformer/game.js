// ============================================================
// MESSI PLATFORMER - Juego de Plataformas 2D estilo Mario Bros
// Tematica: Futbol Argentino - Version 2.0 (Mario-like)
// Stack: Vanilla JS + HTML5 Canvas
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const CANVAS_W = 960;
const CANVAS_H = 540;
const TILE = 32;
const GRAVITY = 0.48;
const JUMP_FORCE = -12;
const JUMP_CUT = 0.4; // variable jump: multiply vy when releasing jump
const PLAYER_SPEED = 4.5;
const PLAYER_ACCEL = 0.4;
const PLAYER_FRICTION = 0.85;
const PLAYER_RUN_SPEED = 6;
const ENEMY_SPEED = 1.0;
const COIN_BOB_SPEED = 0.06;
const COIN_BOB_AMP = 3;
const CAMERA_LERP = 0.1;
const STOMP_BOUNCE = -8;
const INVINCIBLE_TIME = 90;
const MAX_LIVES = 3;
const TERMINAL_VEL = 10;

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// --- Input ---
const keys = {};
let jumpJustPressed = false;
let jumpHeld = false;
window.addEventListener('keydown', e => {
    if (!keys[e.code] && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) {
        jumpJustPressed = true;
    }
    keys[e.code] = true;
    e.preventDefault();
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
    e.preventDefault();
});

// --- Touch Controls ---
let touchLeft = false, touchRight = false, touchJump = false, touchJumpJust = false;
function setupTouchControls() {
    const dpr = window.devicePixelRatio || 1;
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            const rect = canvas.getBoundingClientRect();
            const x = (t.clientX - rect.left) / rect.width * CANVAS_W;
            const y = (t.clientY - rect.top) / rect.height * CANVAS_H;
            if (y > CANVAS_H * 0.5) {
                if (x < CANVAS_W * 0.3) touchLeft = true;
                else if (x < CANVAS_W * 0.6) touchRight = true;
            }
            if (x > CANVAS_W * 0.65) { touchJump = true; touchJumpJust = true; }
        }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        touchLeft = false; touchRight = false; touchJump = false;
    }, { passive: false });
}
setupTouchControls();

// --- Utility ---
function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================================
// SPRITE DRAWING HELPERS
// ============================================================

function drawMessi(x, y, w, h, facing, frame, jumping, big, invTimer) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    if (facing < 0) ctx.scale(-1, 1);

    // Flash when invincible
    if (invTimer > 0 && Math.floor(invTimer / 3) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    const scale = big ? 1.3 : 1.0;
    ctx.scale(scale, scale);
    const offy = big ? -h * 0.15 : 0;

    // Legs (walking animation)
    const legSwing = jumping ? 0.3 : Math.sin(frame * 0.3) * 0.4;
    ctx.fillStyle = '#1a1a6e';
    ctx.fillRect(-w * 0.22, h * 0.55 + offy, w * 0.2, h * 0.35);
    ctx.fillRect(w * 0.05, h * 0.55 + offy, w * 0.2, h * 0.35);
    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(-w * 0.24, h * 0.85 + offy, w * 0.24, h * 0.1);
    ctx.fillRect(w * 0.03, h * 0.85 + offy, w * 0.24, h * 0.1);

    // Body (Argentina jersey)
    ctx.fillStyle = '#75AADB';
    ctx.fillRect(-w * 0.3, h * 0.2 + offy, w * 0.6, h * 0.4);
    // White stripes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-w * 0.15, h * 0.2 + offy, w * 0.12, h * 0.4);
    ctx.fillRect(w * 0.05, h * 0.2 + offy, w * 0.12, h * 0.4);
    // Number 10
    ctx.fillStyle = '#1a1a6e';
    ctx.font = `bold ${Math.floor(h * 0.15)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('10', 0, h * 0.48 + offy);
    ctx.textAlign = 'left';

    // Arms
    ctx.fillStyle = '#D4A574';
    const armSwing = jumping ? -0.5 : Math.sin(frame * 0.3) * 0.3;
    ctx.fillRect(-w * 0.42, h * 0.22 + offy, w * 0.14, h * 0.25);
    ctx.fillRect(w * 0.28, h * 0.22 + offy, w * 0.14, h * 0.25);

    // Head
    ctx.fillStyle = '#D4A574';
    ctx.beginPath();
    ctx.arc(0, h * 0.12 + offy, w * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.arc(0, h * 0.05 + offy, w * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-w * 0.3, h * 0.02 + offy, w * 0.15, h * 0.12);

    // Beard
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(0, h * 0.18 + offy, w * 0.2, 0, Math.PI);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(w * 0.06, h * 0.08 + offy, w * 0.07, w * 0.07);
    ctx.fillRect(-w * 0.13, h * 0.08 + offy, w * 0.07, w * 0.07);

    ctx.restore();
}

function drawEnemy(x, y, w, h, type, frame, alive) {
    ctx.save();
    ctx.translate(x + w / 2, y);

    if (!alive) {
        // Squashed
        ctx.scale(1.3, 0.3);
        ctx.globalAlpha = 0.6;
    }

    const colors = [
        { shirt: '#009739', shorts: '#FFDF00', socks: '#002776' }, // Brasil
        { shirt: '#003399', shorts: '#FFFFFF', socks: '#003399' }, // Francia
        { shirt: '#FF6600', shorts: '#000', socks: '#000' }, // Holanda
    ];
    const c = colors[type % 3];

    // Legs
    const legFrame = Math.sin(frame * 0.15) * 0.4;
    ctx.fillStyle = c.socks;
    ctx.fillRect(-w * 0.2, h * 0.6, w * 0.18, h * 0.35);
    ctx.fillRect(w * 0.05, h * 0.6, w * 0.18, h * 0.35);
    ctx.fillStyle = '#333';
    ctx.fillRect(-w * 0.22, h * 0.88, w * 0.22, h * 0.1);
    ctx.fillRect(w * 0.03, h * 0.88, w * 0.22, h * 0.1);

    // Body
    ctx.fillStyle = c.shirt;
    ctx.fillRect(-w * 0.3, h * 0.25, w * 0.6, h * 0.38);

    // Arms
    ctx.fillStyle = '#C4956A';
    ctx.fillRect(-w * 0.4, h * 0.27, w * 0.12, h * 0.2);
    ctx.fillRect(w * 0.28, h * 0.27, w * 0.12, h * 0.2);

    // Head
    ctx.fillStyle = '#C4956A';
    ctx.beginPath();
    ctx.arc(0, h * 0.16, w * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.arc(0, h * 0.09, w * 0.28, Math.PI, Math.PI * 2);
    ctx.fill();

    // Angry eyes
    if (alive) {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-w * 0.15, h * 0.1, w * 0.12, w * 0.1);
        ctx.fillRect(w * 0.04, h * 0.1, w * 0.12, w * 0.1);
        ctx.fillStyle = '#F00';
        ctx.fillRect(-w * 0.12, h * 0.12, w * 0.06, w * 0.06);
        ctx.fillRect(w * 0.07, h * 0.12, w * 0.06, w * 0.06);
        // Angry brows
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.17, h * 0.06);
        ctx.lineTo(-w * 0.04, h * 0.09);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.17, h * 0.06);
        ctx.lineTo(w * 0.04, h * 0.09);
        ctx.stroke();
    }

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
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // $ sign
    ctx.fillStyle = '#DAA520';
    ctx.font = `bold ${r}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
}

// --- Platform drawing ---
function drawPlatform(x, y, w, h, type) {
    switch (type) {
        case 'grass':
            ctx.fillStyle = '#8B5E3C';
            ctx.fillRect(x, y, w, h);
            // Dirt layers
            ctx.fillStyle = '#A0714F';
            for (let dx = 0; dx < w; dx += TILE) {
                ctx.fillRect(x + dx + 2, y + 6, TILE - 4, 4);
            }
            // Green top
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, y, w, 6);
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(x, y, w, 3);
            // Grass blades
            ctx.fillStyle = '#388E3C';
            for (let gx = x + 4; gx < x + w; gx += 8) {
                ctx.fillRect(gx, y - 2, 2, 4);
            }
            break;

        case 'brick':
            ctx.fillStyle = '#C0855A';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#8B5E3C';
            ctx.lineWidth = 1;
            for (let row = 0; row < h; row += TILE / 2) {
                const offset = (Math.floor(row / (TILE / 2)) % 2) * (TILE / 2);
                for (let col = -offset; col < w; col += TILE) {
                    ctx.strokeRect(x + col, y + row, TILE, TILE / 2);
                }
            }
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x, y, w, 2);
            break;

        case 'question':
            ctx.fillStyle = '#E8A317';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#B8860B';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            // Rivets
            ctx.fillStyle = '#B8860B';
            const cx = x + w / 2, cy = y + h / 2;
            ctx.fillRect(x + 3, y + 3, 4, 4);
            ctx.fillRect(x + w - 7, y + 3, 4, 4);
            ctx.fillRect(x + 3, y + h - 7, 4, 4);
            ctx.fillRect(x + w - 7, y + h - 7, 4, 4);
            // ?
            ctx.fillStyle = '#FFF';
            ctx.font = `bold ${h * 0.6}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', cx, cy + 1);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            break;

        case 'question_used':
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#6B5340';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            break;

        case 'pipe_top':
            // Pipe top (wider lip)
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#43A047';
            ctx.fillRect(x + 2, y + 2, w * 0.3, h - 4);
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(x + w - w * 0.2, y, w * 0.2, h);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 4, y, 6, h);
            break;

        case 'pipe_body':
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(x + 4, y, w - 8, h);
            ctx.fillStyle = '#43A047';
            ctx.fillRect(x + 6, y, w * 0.25, h);
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(x + w - w * 0.2 - 4, y, w * 0.2, h);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x + 8, y, 4, h);
            break;

        case 'goal':
            ctx.fillStyle = '#FFF';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#DDD';
            ctx.lineWidth = 1;
            // Net pattern
            for (let gx = 0; gx < w; gx += 8) {
                ctx.beginPath();
                ctx.moveTo(x + gx, y);
                ctx.lineTo(x + gx, y + h);
                ctx.stroke();
            }
            for (let gy = 0; gy < h; gy += 8) {
                ctx.beginPath();
                ctx.moveTo(x, y + gy);
                ctx.lineTo(x + w, y + gy);
                ctx.stroke();
            }
            // Top bar
            ctx.fillStyle = '#EEE';
            ctx.fillRect(x, y, w, 4);
            break;

        case 'field':
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, y, w, h);
            // Stripes
            ctx.fillStyle = '#43A047';
            for (let sx = 0; sx < w; sx += TILE * 2) {
                ctx.fillRect(x + sx, y, TILE, h);
            }
            // White line
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(x, y + h / 2);
            ctx.lineTo(x + w, y + h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            break;

        default:
            ctx.fillStyle = '#999';
            ctx.fillRect(x, y, w, h);
    }
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================

class Particle {
    constructor(x, y, color, life) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.8) * 5;
        this.color = color;
        this.life = life || 30;
        this.maxLife = this.life;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
        this.vx *= 0.98;
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
// FLOATING TEXT (score popups)
// ============================================================
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color || '#FFF';
        this.life = 45;
        this.maxLife = 45;
    }
    update() {
        this.y -= 1.2;
        this.life--;
    }
    draw(camX) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x - camX, this.y);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
}

// ============================================================
// CAMERA
// ============================================================

class Camera {
    constructor() { this.x = 0; this.targetX = 0; }
    follow(player, levelWidth) {
        this.targetX = player.x - CANVAS_W * 0.38;
        this.targetX = clamp(this.targetX, 0, levelWidth - CANVAS_W);
        this.x = lerp(this.x, this.targetX, CAMERA_LERP);
    }
}

// ============================================================
// PLAYER
// ============================================================

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 36;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.onGround = false;
        this.jumping = false;
        this.jumpHeld = false;
        this.walkFrame = 0;
        this.lives = MAX_LIVES;
        this.score = 0;
        this.coins = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.invincibleTimer = 0;
        this.spawnX = x;
        this.spawnY = y;
        this.big = false;
        this.coyoteTime = 0;
        this.jumpBuffer = 0;
        this.wasOnGround = false;
        this.running = false;
    }

    update(platforms) {
        if (this.dead) {
            this.deathTimer++;
            this.vy += GRAVITY;
            this.y += this.vy;
            return;
        }

        if (this.invincibleTimer > 0) this.invincibleTimer--;

        // Input
        const left = keys['ArrowLeft'] || keys['KeyA'] || touchLeft;
        const right = keys['ArrowRight'] || keys['KeyD'] || touchRight;
        const jumpPress = jumpJustPressed || touchJumpJust;
        const jumpHold = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchJump;
        this.running = keys['ShiftLeft'] || keys['ShiftRight'];
        const maxSpeed = this.running ? PLAYER_RUN_SPEED : PLAYER_SPEED;

        // Horizontal movement
        if (left) {
            this.vx -= PLAYER_ACCEL;
            this.facing = -1;
        } else if (right) {
            this.vx += PLAYER_ACCEL;
            this.facing = 1;
        } else {
            this.vx *= PLAYER_FRICTION;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }
        this.vx = clamp(this.vx, -maxSpeed, maxSpeed);

        if (Math.abs(this.vx) > 0.5 && this.onGround) {
            this.walkFrame += 0.15 * Math.abs(this.vx);
        }

        // Coyote time
        if (this.onGround) {
            this.coyoteTime = 8;
        } else {
            this.coyoteTime--;
        }

        // Jump buffer
        if (jumpPress) {
            this.jumpBuffer = 8;
        } else {
            this.jumpBuffer--;
        }

        // Jump
        if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
            this.vy = JUMP_FORCE;
            this.jumping = true;
            this.onGround = false;
            this.coyoteTime = 0;
            this.jumpBuffer = 0;
        }

        // Variable jump height - cut jump short when releasing
        if (!jumpHold && this.vy < 0) {
            this.vy *= 0.92; // Gradual cut for smoother feel
        }

        // Gravity
        this.vy += GRAVITY;
        if (this.vy > TERMINAL_VEL) this.vy = TERMINAL_VEL;

        // Move X
        this.x += this.vx;
        this.wasOnGround = this.onGround;
        this.onGround = false;

        // Collision X
        for (const p of platforms) {
            if (p.type === 'coin_block' && p.used) continue;
            const pr = this.getRect();
            const plat = { x: p.x, y: p.y, w: p.w, h: p.h };
            if (rectOverlap(pr, plat)) {
                if (this.vx > 0) {
                    this.x = p.x - this.w;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = p.x + p.w;
                    this.vx = 0;
                }
            }
        }

        // Move Y
        this.y += this.vy;

        // Collision Y
        for (const p of platforms) {
            if (p.type === 'coin_block' && p.used) continue;
            const pr = this.getRect();
            const plat = { x: p.x, y: p.y, w: p.w, h: p.h };
            if (rectOverlap(pr, plat)) {
                if (this.vy > 0) {
                    // Landing on top
                    this.y = p.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                    this.jumping = false;
                } else if (this.vy < 0) {
                    // Hitting from below
                    this.y = p.y + p.h;
                    this.vy = 0;
                    // Trigger block hit
                    if (p.onHitBelow) p.onHitBelow(p);
                }
            }
        }

        jumpJustPressed = false;
        touchJumpJust = false;
    }

    draw(camX) {
        const sx = this.x - camX;
        if (sx < -50 || sx > CANVAS_W + 50) return;
        drawMessi(sx, this.y, this.w, this.h, this.facing, this.walkFrame, this.jumping, this.big, this.invincibleTimer);
    }

    hurt() {
        if (this.invincibleTimer > 0) return;
        if (this.big) {
            this.big = false;
            this.invincibleTimer = INVINCIBLE_TIME;
            return;
        }
        this.lives--;
        this.invincibleTimer = INVINCIBLE_TIME;
        if (this.lives <= 0) {
            this.die();
        }
    }

    die() {
        this.dead = true;
        this.vy = -8;
        this.deathTimer = 0;
    }

    respawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.invincibleTimer = INVINCIBLE_TIME;
        this.jumping = false;
        this.onGround = false;
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// ============================================================
// ENEMY
// ============================================================

class Enemy {
    constructor(x, y, type, rangeLeft, rangeRight) {
        this.x = x;
        this.y = y;
        this.w = 26;
        this.h = 34;
        this.type = type;
        this.speed = ENEMY_SPEED;
        this.dir = 1;
        this.alive = true;
        this.deathTimer = 0;
        this.rangeLeft = rangeLeft;
        this.rangeRight = rangeRight;
        this.walkFrame = Math.random() * 100;
        this.vy = 0;
    }

    update(platforms) {
        if (!this.alive) {
            this.deathTimer++;
            return;
        }

        this.walkFrame += 0.12;

        // Apply gravity to enemy
        this.vy += GRAVITY;
        if (this.vy > TERMINAL_VEL) this.vy = TERMINAL_VEL;
        this.y += this.vy;

        // Vertical collision
        for (const p of platforms) {
            if (p.type === 'coin_block' && p.used) continue;
            const er = this.getRect();
            const plat = { x: p.x, y: p.y, w: p.w, h: p.h };
            if (rectOverlap(er, plat)) {
                if (this.vy > 0) {
                    this.y = p.y - this.h;
                    this.vy = 0;
                }
            }
        }

        // Horizontal movement
        this.x += this.speed * this.dir;

        // Range limits
        if (this.x <= this.rangeLeft) { this.dir = 1; this.x = this.rangeLeft; }
        if (this.x + this.w >= this.rangeRight) { this.dir = -1; this.x = this.rangeRight - this.w; }

        // Platform edge detection
        let onEdge = true;
        const footX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        const footY = this.y + this.h + 4;
        for (const p of platforms) {
            if (footX >= p.x && footX <= p.x + p.w && footY >= p.y && footY <= p.y + p.h + 8) {
                onEdge = false;
                break;
            }
        }
        if (onEdge && this.vy === 0) {
            this.dir *= -1;
        }
    }

    draw(camX) {
        if (this.deathTimer > 25) return;
        const sx = this.x - camX;
        drawEnemy(sx, this.y, this.w, this.h, this.type, this.walkFrame, this.alive);
    }

    stomp() {
        this.alive = false;
        this.deathTimer = 0;
    }

    getRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// ============================================================
// COIN
// ============================================================

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.r = 8;
        this.collected = false;
        this.frame = Math.random() * 100;
    }
    update() {
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

// ============================================================
// MUSHROOM (Power-up)
// ============================================================

class Mushroom {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 24;
        this.vx = 2;
        this.vy = 0;
        this.active = true;
        this.emerging = true;
        this.emergeY = y;
        this.startY = y + TILE;
        this.emergeTimer = 0;
    }
    update(platforms) {
        if (!this.active) return;
        if (this.emerging) {
            this.emergeTimer++;
            this.y = this.startY - (this.emergeTimer / 20) * TILE;
            if (this.emergeTimer >= 20) {
                this.emerging = false;
                this.y = this.emergeY;
            }
            return;
        }
        this.vy += GRAVITY;
        if (this.vy > TERMINAL_VEL) this.vy = TERMINAL_VEL;
        this.x += this.vx;
        this.y += this.vy;
        for (const p of platforms) {
            const mr = this.getRect();
            const plat = { x: p.x, y: p.y, w: p.w, h: p.h };
            if (rectOverlap(mr, plat)) {
                if (this.vy > 0) {
                    this.y = p.y - this.h;
                    this.vy = 0;
                } else if (this.vx > 0) {
                    this.x = p.x - this.w;
                    this.vx *= -1;
                } else if (this.vx < 0) {
                    this.x = p.x + p.w;
                    this.vx *= -1;
                }
            }
        }
    }
    draw(camX) {
        if (!this.active) return;
        const sx = this.x - camX;
        // Mushroom cap (red with white dots - like Mario)
        ctx.fillStyle = '#E53935';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y + 8, 14, Math.PI, 0);
        ctx.fill();
        // White dots
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2 - 6, this.y + 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + this.w / 2 + 6, this.y + 3, 3, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.fillStyle = '#FFECB3';
        ctx.fillRect(sx + this.w / 2 - 7, this.y + 8, 14, 14);
        // Eyes
        ctx.fillStyle = '#333';
        ctx.fillRect(sx + this.w / 2 - 5, this.y + 12, 3, 4);
        ctx.fillRect(sx + this.w / 2 + 2, this.y + 12, 3, 4);
    }
    getRect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// ============================================================
// MOVING PLATFORM
// ============================================================

class MovingPlatform {
    constructor(x, y, w, h, moveX, moveY, speed) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.startX = x;
        this.startY = y;
        this.moveX = moveX || 0;
        this.moveY = moveY || 0;
        this.speed = speed || 0.015;
        this.t = 0;
        this.type = 'field';
    }
    update() {
        this.t += this.speed;
        const s = Math.sin(this.t);
        this.x = this.startX + s * this.moveX;
        this.y = this.startY + s * this.moveY;
    }
    draw(camX) {
        const sx = this.x - camX;
        if (sx + this.w > 0 && sx < CANVAS_W) {
            drawPlatform(sx, this.y, this.w, this.h, this.type);
        }
    }
}

// ============================================================
// FLAG POLE
// ============================================================

class FlagPole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 8;
        this.h = 180;
        this.reached = false;
    }
    draw(camX) {
        const sx = this.x - camX;
        if (sx < -50 || sx > CANVAS_W + 50) return;
        // Pole
        ctx.fillStyle = '#78909C';
        ctx.fillRect(sx, this.y, this.w, this.h);
        // Ball on top
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + this.w / 2, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        // Argentina flag
        if (!this.reached) {
            ctx.fillStyle = '#75AADB';
            ctx.fillRect(sx + this.w, this.y + 5, 30, 8);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(sx + this.w, this.y + 13, 30, 8);
            ctx.fillStyle = '#75AADB';
            ctx.fillRect(sx + this.w, this.y + 21, 30, 8);
            // Sol de Mayo
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(sx + this.w + 15, this.y + 17, 4, 0, Math.PI * 2);
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
    const T = TILE;
    const platforms = [];
    const enemies = [];
    const coins = [];
    const mushrooms_spawns = []; // block positions that spawn mushrooms
    const movingPlatforms = [];
    const groundY = CANVAS_H - 64;

    // Helper to add a ground section
    function addGround(startTile, endTile) {
        platforms.push({
            x: T * startTile, y: groundY,
            w: T * (endTile - startTile), h: T * 3,
            type: 'grass'
        });
    }

    // Helper to add pipe
    function addPipe(tileX, height) {
        platforms.push({
            x: T * tileX, y: groundY - T * height,
            w: T * 2, h: T,
            type: 'pipe_top'
        });
        if (height > 1) {
            platforms.push({
                x: T * tileX, y: groundY - T * (height - 1),
                w: T * 2, h: T * (height - 1),
                type: 'pipe_body'
            });
        }
    }

    // Helper to add question block
    function addQuestionBlock(tileX, tileY, hasMushroom) {
        const block = {
            x: T * tileX, y: groundY - T * tileY,
            w: T, h: T,
            type: 'question',
            used: false,
            bounceTimer: 0,
            hasMushroom: hasMushroom || false,
            onHitBelow: function(p) {
                if (!p.used) {
                    p.used = true;
                    p.type = 'question_used';
                    p.bounceTimer = 10;
                    if (p.hasMushroom) {
                        mushrooms.push(new Mushroom(p.x + T / 2 - 12, p.y - T));
                    } else {
                        // Spawn coin above
                        floatingTexts.push(new FloatingText(p.x + T / 2, p.y - 10, '+50', '#FFD700'));
                        player.coins++;
                        player.score += 50;
                    }
                }
            }
        };
        platforms.push(block);
    }

    // Helper to add brick block
    function addBrick(tileX, tileY) {
        platforms.push({
            x: T * tileX, y: groundY - T * tileY,
            w: T, h: T,
            type: 'brick'
        });
    }

    // ===== WORLD 1-1 STYLE LAYOUT =====

    // --- Section 1: Starting area ---
    addGround(0, 22);

    // First coins on ground
    for (let i = 3; i <= 5; i++) coins.push(new Coin(T * i + T / 2, groundY - T * 1.5));

    // Question blocks (like Mario's first ? blocks)
    addQuestionBlock(5, 4, false);
    addQuestionBlock(8, 4, false);
    addQuestionBlock(9, 4, true); // Mushroom!
    addQuestionBlock(10, 4, false);
    addBrick(7, 4);
    addBrick(11, 4);

    // Small pipe
    addPipe(14, 2);

    // Enemy on starting ground
    enemies.push(new Enemy(T * 7, groundY - 36, 0, T * 4, T * 13));
    enemies.push(new Enemy(T * 12, groundY - 36, 1, T * 10, T * 13));

    // Coins above pipe
    coins.push(new Coin(T * 14.5 + T / 2, groundY - T * 3.5));

    // Medium pipe
    addPipe(17, 3);

    // --- Section 2: First gap + stepping stones ---
    // Gap from tile 22 to 26
    // Floating platforms over gap
    platforms.push({ x: T * 22, y: groundY - T * 2, w: T * 2, h: T, type: 'field' });
    platforms.push({ x: T * 25, y: groundY - T * 3, w: T * 2, h: T, type: 'field' });

    coins.push(new Coin(T * 23, groundY - T * 3.5));
    coins.push(new Coin(T * 26, groundY - T * 4.5));

    addGround(28, 50);

    // Question blocks section 2
    addQuestionBlock(30, 4, false);
    addQuestionBlock(32, 4, false);
    addQuestionBlock(31, 7, true); // Mushroom high up

    // Brick row
    for (let i = 34; i <= 38; i++) addBrick(i, 4);

    // Coins along brick row
    for (let i = 34; i <= 38; i++) coins.push(new Coin(T * i + T / 2, groundY - T * 5.5));

    // Enemies section 2
    enemies.push(new Enemy(T * 31, groundY - 36, 2, T * 29, T * 40));
    enemies.push(new Enemy(T * 36, groundY - 36, 0, T * 33, T * 42));

    // Pipe
    addPipe(41, 2);
    addPipe(44, 3);

    // --- Section 3: Staircase ---
    // Mario-style ascending stairs
    for (let i = 0; i < 4; i++) {
        platforms.push({
            x: T * (47 + i), y: groundY - T * (i + 1),
            w: T, h: T * (i + 1),
            type: 'brick'
        });
    }

    // Coins on top of staircase
    coins.push(new Coin(T * 50 + T / 2, groundY - T * 5.5));

    // --- Gap 2 ---
    // Ground ends at 50, resumes at 54
    addGround(54, 76);

    // Floating platform in gap
    movingPlatforms.push(new MovingPlatform(T * 51, groundY - T * 3, T * 3, T * 0.5, T * 1.5, 0, 0.02));

    // --- Section 4: Underground feel - lots of bricks ---
    // Brick ceiling
    for (let i = 56; i <= 63; i++) addBrick(i, 7);
    addQuestionBlock(58, 4, false);
    addQuestionBlock(60, 4, false);
    addQuestionBlock(62, 4, true); // Mushroom

    // Enemies
    enemies.push(new Enemy(T * 57, groundY - 36, 1, T * 55, T * 65));
    enemies.push(new Enemy(T * 61, groundY - 36, 2, T * 55, T * 65));
    enemies.push(new Enemy(T * 64, groundY - 36, 0, T * 55, T * 70));

    // Coins under bricks
    for (let i = 57; i <= 62; i += 2) {
        coins.push(new Coin(T * i + T / 2, groundY - T * 2));
    }

    // Pipe section
    addPipe(67, 2);
    addPipe(70, 3);
    addPipe(73, 2);

    // Coins between pipes
    coins.push(new Coin(T * 68.5 + T / 2, groundY - T * 1.5));
    coins.push(new Coin(T * 71.5 + T / 2, groundY - T * 1.5));

    // --- Section 5: Platforming challenge ---
    // Gap from 76 to 80
    platforms.push({ x: T * 76.5, y: groundY - T * 2, w: T * 2, h: T, type: 'field' });
    movingPlatforms.push(new MovingPlatform(T * 79, groundY - T * 4, T * 3, T * 0.5, 0, T * 2, 0.018));

    addGround(82, 105);

    // Staircase up
    for (let i = 0; i < 3; i++) {
        platforms.push({
            x: T * (83 + i), y: groundY - T * (i + 1),
            w: T, h: T * (i + 1),
            type: 'brick'
        });
    }

    // Floating platforms high section
    platforms.push({ x: T * 87, y: groundY - T * 4, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 91, y: groundY - T * 5, w: T * 3, h: T, type: 'field' });
    platforms.push({ x: T * 95, y: groundY - T * 4, w: T * 3, h: T, type: 'field' });

    // Coins on floating platforms
    coins.push(new Coin(T * 88 + T / 2, groundY - T * 5.5));
    coins.push(new Coin(T * 89 + T / 2, groundY - T * 5.5));
    coins.push(new Coin(T * 92 + T / 2, groundY - T * 6.5));
    coins.push(new Coin(T * 93 + T / 2, groundY - T * 6.5));
    coins.push(new Coin(T * 96 + T / 2, groundY - T * 5.5));

    // Question blocks
    addQuestionBlock(88, 8, false);
    addQuestionBlock(92, 9, true); // Mushroom

    // Enemies section 5
    enemies.push(new Enemy(T * 85, groundY - 36, 1, T * 83, T * 95));
    enemies.push(new Enemy(T * 90, groundY - 36, 2, T * 83, T * 100));
    enemies.push(new Enemy(T * 88, groundY - T * 4 - 36, 0, T * 87, T * 90)); // On platform

    // --- Section 6: Final run ---
    // Descending staircase
    for (let i = 0; i < 4; i++) {
        platforms.push({
            x: T * (98 - i), y: groundY - T * (i + 1),
            w: T, h: T * (i + 1),
            type: 'brick'
        });
    }

    // Final gauntlet enemies
    enemies.push(new Enemy(T * 100, groundY - 36, 0, T * 99, T * 105));
    enemies.push(new Enemy(T * 102, groundY - 36, 1, T * 99, T * 105));
    enemies.push(new Enemy(T * 104, groundY - 36, 2, T * 99, T * 105));

    // Final coins
    for (let i = 100; i <= 103; i++) {
        coins.push(new Coin(T * i + T / 2, groundY - T * 1.5));
    }

    // --- Final staircase (Mario style: ascending steps to flagpole) ---
    for (let i = 0; i < 8; i++) {
        platforms.push({
            x: T * (107 + i), y: groundY - T * (i + 1),
            w: T, h: T * (i + 1),
            type: 'brick'
        });
    }

    // Goal area ground
    addGround(115, 120);

    // Flag pole at the end
    const flagPole = new FlagPole(T * 116, groundY - 180);

    const levelWidth = T * 125;

    return { platforms, enemies, coins, flagPole, levelWidth, groundY, movingPlatforms };
}

// ============================================================
// BACKGROUND DRAWING
// ============================================================

function drawBackground(camX) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#6BB3F0');
    grad.addColorStop(0.55, '#A8D8F0');
    grad.addColorStop(0.8, '#C8E6C9');
    grad.addColorStop(1, '#A5D6A7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sun (Sol de Mayo)
    const sunX = 780 - camX * 0.04;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, 65, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFAC1C';
    ctx.beginPath();
    ctx.arc(sunX, 65, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, 65, 16, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + globalFrame * 0.003;
        const inner = 32;
        const outer = i % 2 === 0 ? 48 : 40;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * inner, 65 + Math.sin(angle) * inner);
        ctx.lineTo(sunX + Math.cos(angle) * outer, 65 + Math.sin(angle) * outer);
        ctx.stroke();
    }

    // Clouds
    const clouds = [
        { x: 80, y: 45, w: 70 }, { x: 350, y: 75, w: 90 }, { x: 620, y: 35, w: 60 },
        { x: 950, y: 55, w: 80 }, { x: 1300, y: 40, w: 75 }, { x: 1700, y: 65, w: 85 },
        { x: 2200, y: 50, w: 70 }, { x: 2800, y: 60, w: 80 }, { x: 3400, y: 42, w: 90 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of clouds) {
        const cx = c.x - camX * 0.12;
        const wx = ((cx % (CANVAS_W + 200)) + CANVAS_W + 200) % (CANVAS_W + 200) - 100;
        ctx.beginPath();
        ctx.arc(wx, c.y, c.w * 0.28, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.22, c.y - 7, c.w * 0.22, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.45, c.y, c.w * 0.3, 0, Math.PI * 2);
        ctx.arc(wx + c.w * 0.3, c.y + 4, c.w * 0.18, 0, Math.PI * 2);
        ctx.fill();
    }

    // Distant hills
    ctx.fillStyle = '#90CAF9';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H * 0.72);
    for (let i = 0; i <= CANVAS_W; i += 60) {
        const mx = i - (camX * 0.06) % 60;
        ctx.lineTo(mx, CANVAS_H * 0.62 + Math.sin(i * 0.012) * 25 + Math.cos(i * 0.007) * 15);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Near hills
    ctx.fillStyle = '#81C784';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H * 0.82);
    for (let i = 0; i <= CANVAS_W; i += 50) {
        const mx = i - (camX * 0.18) % 50;
        ctx.lineTo(mx, CANVAS_H * 0.76 + Math.sin(i * 0.018 + 1) * 12);
    }
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Stadium lights
    const lightPositions = [400, 1600, 3200];
    for (const lp of lightPositions) {
        const lx = lp - camX * 0.08;
        if (lx > -50 && lx < CANVAS_W + 50) {
            ctx.fillStyle = '#90A4AE';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(lx, CANVAS_H * 0.42, 5, CANVAS_H * 0.38);
            ctx.fillStyle = '#CFD8DC';
            ctx.fillRect(lx - 7, CANVAS_H * 0.4, 19, 8);
            ctx.fillStyle = 'rgba(255,255,200,0.1)';
            ctx.beginPath();
            ctx.moveTo(lx + 2, CANVAS_H * 0.42);
            ctx.lineTo(lx - 15, CANVAS_H * 0.72);
            ctx.lineTo(lx + 20, CANVAS_H * 0.72);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

// ============================================================
// HUD
// ============================================================

function drawHUD(player) {
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, 34);

    // Lives
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('MESSI', 12, 14);
    ctx.fillStyle = '#FF4444';
    for (let i = 0; i < player.lives; i++) {
        const hx = 12 + i * 14;
        ctx.fillRect(hx, 19, 10, 10);
        ctx.fillStyle = '#FF6666';
        ctx.fillRect(hx + 2, 21, 4, 4);
        ctx.fillStyle = '#FF4444';
    }

    // Coins
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(120, 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('x' + player.coins, 130, 23);

    // Score
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(String(player.score).padStart(6, '0'), 200, 23);

    // World label
    ctx.fillStyle = '#FFF';
    ctx.fillText('WORLD', 340, 14);
    ctx.fillText(' 1-1', 340, 28);

    // Time (cosmetic)
    ctx.fillStyle = '#FFF';
    ctx.fillText('TIME', 450, 14);
    const time = Math.max(0, 400 - Math.floor(globalFrame / 60));
    ctx.fillText(' ' + time, 455, 28);

    // Title
    ctx.fillStyle = '#75AADB';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('MESSI WORLD CUP RUN', CANVAS_W - 10, 22);
    ctx.textAlign = 'left';
}

// ============================================================
// SCREENS
// ============================================================

function drawStartScreen(frame) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#1a237e');
    grad.addColorStop(0.5, '#283593');
    grad.addColorStop(1, '#1565C0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Twinkling stars
    ctx.fillStyle = '#FFD700';
    const starPositions = [
        [200, 60], [350, 90], [550, 50], [700, 80], [150, 130],
        [450, 30], [800, 110], [100, 80], [650, 130], [300, 45],
        [860, 55], [50, 100], [500, 95], [750, 40],
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
    const starY = 115;
    for (let i = 0; i < 3; i++) {
        const sx = CANVAS_W / 2 - 60 + i * 60;
        drawStar(sx, starY, 15, '#FFD700');
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText('MESSI', CANVAS_W / 2 + 3, 193);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MESSI', CANVAS_W / 2, 190);
    ctx.fillStyle = '#75AADB';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('WORLD CUP RUN', CANVAS_W / 2, 225);

    // Messi character
    drawMessi(CANVAS_W / 2 - 25, 255, 50, 80, 1, frame, false, false, 0);

    // ? block decoration
    const qbX = CANVAS_W / 2 - 100;
    drawPlatform(qbX, 300, 32, 32, 'question');
    drawPlatform(qbX + 170, 300, 32, 32, 'question');

    // Coin decorations
    drawCoin(qbX + 16, 275, 8, frame);
    drawCoin(qbX + 186, 275, 8, frame);

    // Instructions
    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('PRESIONA ENTER PARA JUGAR', CANVAS_W / 2, 400);
    }

    ctx.fillStyle = '#B0BEC5';
    ctx.font = '13px monospace';
    ctx.fillText('Flechas / WASD: Mover  |  ESPACIO: Saltar  |  SHIFT: Correr', CANVAS_W / 2, 440);
    ctx.fillText('Salta sobre los rivales para derrotarlos', CANVAS_W / 2, 462);
    ctx.fillStyle = '#78909C';
    ctx.font = '11px monospace';
    ctx.fillText('En movil: toca izquierda/derecha para mover, derecha de pantalla para saltar', CANVAS_W / 2, 490);

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

function drawGameOverScreen(frame, score, coinCount) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 52px monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 180);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px monospace';
    ctx.fillText('Puntos: ' + score, CANVAS_W / 2, 250);
    ctx.fillText('Monedas: ' + coinCount, CANVAS_W / 2, 285);

    // Sad Messi
    drawMessi(CANVAS_W / 2 - 20, 310, 40, 64, 1, 0, false, false, 0);

    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('PRESIONA ENTER PARA REINICIAR', CANVAS_W / 2, 430);
    }

    ctx.textAlign = 'left';
}

function drawWinScreen(frame, score, coinCount) {
    ctx.fillStyle = 'rgba(0,0,50,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.textAlign = 'center';

    // Confetti
    for (let i = 0; i < 40; i++) {
        const cx = (Math.sin(frame * 0.018 + i * 2.7) + 1) * CANVAS_W / 2;
        const cy = ((frame * 1.8 + i * 35) % (CANVAS_H + 20)) - 10;
        const colors = ['#75AADB', '#FFFFFF', '#FFD700', '#FF4444', '#4CAF50'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(frame * 0.05 + i);
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('CAMPEON DEL MUNDO!', CANVAS_W / 2, 140);

    // Stars
    for (let i = 0; i < 3; i++) {
        drawStar(CANVAS_W / 2 - 70 + i * 70, 185, 20, '#FFD700');
    }

    // Trophy
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(CANVAS_W / 2 - 18, 220, 36, 45);
    ctx.fillRect(CANVAS_W / 2 - 28, 215, 56, 12);
    ctx.fillRect(CANVAS_W / 2 - 8, 265, 16, 12);
    ctx.fillRect(CANVAS_W / 2 - 18, 277, 36, 7);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 - 28, 235, 10, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 + 28, 235, 10, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px monospace';
    ctx.fillText('Puntos: ' + score, CANVAS_W / 2, 330);
    ctx.fillText('Monedas: ' + coinCount, CANVAS_W / 2, 360);

    const blink = Math.sin(frame * 0.06) > 0;
    if (blink) {
        ctx.fillStyle = '#75AADB';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('PRESIONA ENTER PARA JUGAR DE NUEVO', CANVAS_W / 2, 430);
    }

    ctx.textAlign = 'left';
}

// ============================================================
// GAME STATE MACHINE
// ============================================================

const STATE = { START: 0, PLAYING: 1, GAME_OVER: 2, WIN: 3 };

let gameState = STATE.START;
let globalFrame = 0;
let player, camera, level, particles, floatingTexts, mushrooms;
let enterPressed = false;

function initGame() {
    level = buildLevel();
    player = new Player(TILE * 2, level.groundY - 50);
    camera = new Camera();
    particles = [];
    floatingTexts = [];
    mushrooms = [];
    gameState = STATE.PLAYING;
}

window.addEventListener('keydown', e => {
    if (e.code === 'Enter') enterPressed = true;
});

// ============================================================
// MAIN GAME LOOP
// ============================================================

function gameLoop() {
    globalFrame++;

    switch (gameState) {
        case STATE.START: updateStartScreen(); break;
        case STATE.PLAYING: updatePlaying(); break;
        case STATE.GAME_OVER: updateGameOver(); break;
        case STATE.WIN: updateWin(); break;
    }

    enterPressed = false;
    requestAnimationFrame(gameLoop);
}

function updateStartScreen() {
    drawStartScreen(globalFrame);
    if (enterPressed) initGame();
}

function updatePlaying() {
    // --- Combine platforms for collision ---
    const allPlatforms = [...level.platforms, ...level.movingPlatforms];

    // --- Update ---
    player.update(allPlatforms);

    for (const e of level.enemies) e.update(allPlatforms);
    for (const c of level.coins) c.update();
    for (const mp of level.movingPlatforms) mp.update();

    // Update mushrooms
    for (const m of mushrooms) {
        if (m.active) m.update(allPlatforms);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }

    // --- Collision: Player vs Enemies ---
    if (!player.dead) {
        for (const e of level.enemies) {
            if (!e.alive) continue;
            const pr = player.getRect();
            const er = e.getRect();
            if (rectOverlap(pr, er)) {
                if (player.vy > 0 && pr.y + pr.h - 6 < er.y + er.h * 0.4) {
                    e.stomp();
                    player.vy = STOMP_BOUNCE;
                    player.score += 100;
                    player.jumping = true;
                    floatingTexts.push(new FloatingText(e.x + e.w / 2, e.y, '100', '#FFF'));
                    for (let i = 0; i < 8; i++) {
                        particles.push(new Particle(e.x + e.w / 2, e.y + e.h / 2,
                            ['#FFD700', '#FF4444', '#FFA500'][i % 3], 25));
                    }
                } else {
                    player.hurt();
                    if (player.dead) {
                        for (let i = 0; i < 12; i++) {
                            particles.push(new Particle(player.x + player.w / 2, player.y + player.h / 2,
                                '#FF4444', 40));
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
            if (rectOverlap(player.getRect(), c.getRect())) {
                c.collected = true;
                player.coins++;
                player.score += 50;
                floatingTexts.push(new FloatingText(c.x, c.y - 10, '50', '#FFD700'));
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(c.x, c.y, '#FFD700', 18));
                }
            }
        }
    }

    // --- Collision: Player vs Mushrooms ---
    if (!player.dead) {
        for (const m of mushrooms) {
            if (!m.active || m.emerging) continue;
            if (rectOverlap(player.getRect(), m.getRect())) {
                m.active = false;
                if (!player.big) {
                    player.big = true;
                    player.score += 200;
                    floatingTexts.push(new FloatingText(m.x, m.y - 10, 'POWER UP!', '#4CAF50'));
                } else {
                    player.score += 200;
                    floatingTexts.push(new FloatingText(m.x, m.y - 10, '200', '#4CAF50'));
                }
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(m.x + m.w / 2, m.y + m.h / 2, '#4CAF50', 20));
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
    if (player.dead && player.deathTimer > 100) {
        gameState = STATE.GAME_OVER;
    }

    // --- Time up ---
    const time = 400 - Math.floor(globalFrame / 60);
    if (time <= 0 && !player.dead) {
        player.die();
    }

    // --- Camera ---
    camera.follow(player, level.levelWidth);

    // --- Draw ---
    drawBackground(camera.x);

    // Draw platforms
    for (const p of level.platforms) {
        const sx = p.x - camera.x;
        if (sx + p.w > 0 && sx < CANVAS_W) {
            // Bounce animation for ? blocks
            let offsetY = 0;
            if (p.bounceTimer > 0) {
                offsetY = -Math.sin(p.bounceTimer / 10 * Math.PI) * 6;
                p.bounceTimer--;
            }
            drawPlatform(sx, p.y + offsetY, p.w, p.h, p.type);
        }
    }

    // Draw moving platforms
    for (const mp of level.movingPlatforms) {
        mp.draw(camera.x);
    }

    // Draw flag pole
    if (level.flagPole) level.flagPole.draw(camera.x);

    // Draw coins
    for (const c of level.coins) {
        if (!c.collected) {
            const sx = c.x - camera.x;
            if (sx > -20 && sx < CANVAS_W + 20) c.draw(camera.x);
        }
    }

    // Draw mushrooms
    for (const m of mushrooms) {
        if (m.active) {
            const sx = m.x - camera.x;
            if (sx > -30 && sx < CANVAS_W + 30) m.draw(camera.x);
        }
    }

    // Draw enemies
    for (const e of level.enemies) {
        const sx = e.x - camera.x;
        if (sx > -50 && sx < CANVAS_W + 50) e.draw(camera.x);
    }

    // Draw player
    player.draw(camera.x);

    // Draw particles
    ctx.save();
    ctx.translate(-camera.x, 0);
    for (const p of particles) p.draw();
    ctx.restore();

    // Draw floating texts
    for (const ft of floatingTexts) ft.draw(camera.x);

    // HUD
    drawHUD(player);

    // Mobile controls overlay
    if ('ontouchstart' in window) {
        drawTouchControls();
    }
}

function drawTouchControls() {
    ctx.globalAlpha = 0.2;
    // Left arrow
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.moveTo(70, CANVAS_H - 50);
    ctx.lineTo(30, CANVAS_H - 30);
    ctx.lineTo(70, CANVAS_H - 10);
    ctx.fill();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(130, CANVAS_H - 50);
    ctx.lineTo(170, CANVAS_H - 30);
    ctx.lineTo(130, CANVAS_H - 10);
    ctx.fill();
    // Jump button
    ctx.beginPath();
    ctx.arc(CANVAS_W - 60, CANVAS_H - 40, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A', CANVAS_W - 60, CANVAS_H - 35);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
}

function updateGameOver() {
    drawBackground(camera ? camera.x : 0);
    if (level) {
        for (const p of level.platforms) {
            const sx = p.x - camera.x;
            if (sx + p.w > 0 && sx < CANVAS_W) drawPlatform(sx, p.y, p.w, p.h, p.type);
        }
    }
    drawGameOverScreen(globalFrame, player ? player.score : 0, player ? player.coins : 0);
    if (enterPressed) initGame();
}

function updateWin() {
    drawWinScreen(globalFrame, player ? player.score : 0, player ? player.coins : 0);
    if (enterPressed) initGame();
}

// --- Start ---
requestAnimationFrame(gameLoop);
