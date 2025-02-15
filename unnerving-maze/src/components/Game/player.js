import { isBlocking } from './map';

// At the top of the file
const BASE_MOVE_SPEED = 2.5; // Units per second
const ROTATION_SPEED = 2; // Radians per second
const COLLISION_RADIUS = 0.35;
const SUBSTEPS = 5; // Increased collision checks per frame

export function initPlayer() {
    return {
        x: 10.5,
        y: 4.5,
        rotation: 0,
        velocity: { x: 0, y: 0 }, // Add velocity tracking
        moveSpeed: 0.075,
        rotationSpeed: 5,
        input: {
            forward: false,
            backward: false,
            left: false,
            right: false,
            strafe: false
        }
    };
}

export function move(gameState, deltaTime) {
    const { player } = gameState.current;
    const seconds = deltaTime / 1000; // Convert ms to seconds

    // Reset rotation first
    let rotationDelta = 0;
    if (player.input.left) rotationDelta -= ROTATION_SPEED * seconds;
    if (player.input.right) rotationDelta += ROTATION_SPEED * seconds;
    player.rotation += rotationDelta;

    // Calculate movement direction
    let moveDeltaX = 0;
    let moveDeltaY = 0;
    const moveSpeed = BASE_MOVE_SPEED * seconds;

    if (player.input.forward) {
        moveDeltaX += Math.cos(player.rotation) * moveSpeed;
        moveDeltaY += Math.sin(player.rotation) * moveSpeed;
    }
    if (player.input.backward) {
        moveDeltaX -= Math.cos(player.rotation) * moveSpeed;
        moveDeltaY -= Math.sin(player.rotation) * moveSpeed;
    }

    // Apply movement if any
    if (moveDeltaX !== 0 || moveDeltaY !== 0) {
        const newPos = resolveCollision(
            player.x,
            player.y,
            player.x + moveDeltaX,
            player.y + moveDeltaY,
            COLLISION_RADIUS,
            gameState
        );

        player.x = newPos.x;
        player.y = newPos.y;
    }
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function resolveCollision(fromX, fromY, toX, toY, radius, gameState) {
    // Simple immediate collision check
    const collision = checkCollision(fromX, fromY, toX, toY, radius, gameState);
    return collision;
}

export function checkCollision(fromX, fromY, toX, toY, radius, gameState) {

    // First check if target position is valid
    if (isBlocking(Math.floor(toX), Math.floor(toY), gameState)) {
        return { x: fromX, y: fromY };
    }

    // Simple radius check for adjacent cells
    const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
        const checkX = Math.floor(toX + dir.x);
        const checkY = Math.floor(toY + dir.y);

        if (isBlocking(checkX, checkY, gameState)) {
            const dx = toX - (checkX + 0.5);
            const dy = toY - (checkY + 0.5);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius + 0.5) {
                return { x: fromX, y: fromY };
            }
        }
    }

    return { x: toX, y: toY };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export function addKeys(gameState) {
    const handleKey = (e, isKeyDown) => {
        const { input } = gameState.current.player;
        const key = e.key.toLowerCase();

        // Only prevent default for movement keys
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            e.preventDefault();
        }

        switch (key) {
            case 'w': case 'arrowup':
                input.forward = isKeyDown;
                break;
            case 's': case 'arrowdown':
                input.backward = isKeyDown;
                break;
            case 'a': case 'arrowleft':
                input.left = isKeyDown;
                break;
            case 'd': case 'arrowright':
                input.right = isKeyDown;
                break;
            case 'shift':
                input.strafe = isKeyDown;
                break;
        }
    };

    return {
        handleKeyDown: (e) => handleKey(e, true),
        handleKeyUp: (e) => handleKey(e, false)
    };
}