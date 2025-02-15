import { isBlocking } from './map';

// At the top of the file
const BASE_MOVE_SPEED = 2.5; // Units per second
const ROTATION_SPEED = 2; // Radians per second
const COLLISION_RADIUS = 0.35;
const SUBSTEPS = 1; // Increased collision checks per frame

export function initPlayer() {
    return {
        x: 10,
        y: 2.5,
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
    const seconds = deltaTime / 1000;

    // Update rotation first
    if (player.input.left) player.rotation -= ROTATION_SPEED * seconds;
    if (player.input.right) player.rotation += ROTATION_SPEED * seconds;

    // Calculate movement vector
    let moveX = 0;
    let moveY = 0;

    if (player.input.forward || player.input.backward) {
        const direction = player.input.forward ? 1 : -1;
        moveX = Math.cos(player.rotation) * direction * BASE_MOVE_SPEED * seconds;
        moveY = Math.sin(player.rotation) * direction * BASE_MOVE_SPEED * seconds;
    }

    // Try X and Y movements separately to allow sliding along walls
    let newX = player.x;
    let newY = player.y;

    // Try X movement
    const xPos = checkCollision(
        player.x,
        player.y,
        player.x + moveX,
        player.y,
        .35,
        gameState
    );

    // Try Y movement
    const yPos = checkCollision(
        player.x,
        player.y,
        player.x,
        player.y + moveY,
        .35,
        gameState
    );

    // Apply successful movements
    if (xPos.x !== player.x) {
        newX = xPos.x;
    }
    if (yPos.y !== player.y) {
        newY = yPos.y;
    }

    // Final collision check with combined movement
    const finalPos = checkCollision(
        player.x,
        player.y,
        newX,
        newY,
        .35,
        gameState
    );

    player.x = finalPos.x;
    player.y = finalPos.y;
}

export function checkCollision(fromX, fromY, toX, toY, radius, gameState) {
    const position = {
        x: fromX,
        y: fromY
    };

    const mapHeight = gameState.current.mapHeight;
    const mapWidth = gameState.current.mapWidth;

    // Boundary check
    if (toY < 0 || toY >= mapHeight || toX < 0 || toX >= mapWidth) {
        return position;
    }

    const blockX = Math.floor(toX);
    const blockY = Math.floor(toY);

    // Early exit if trying to move into a wall
    if (isBlocking(blockX, blockY, gameState)) {
        return position;
    }

    // Initialize with target position
    position.x = toX;
    position.y = toY;

    // Check adjacent blocks
    const top = isBlocking(blockX, blockY - 1, gameState);
    const bottom = isBlocking(blockX, blockY + 1, gameState);
    const left = isBlocking(blockX - 1, blockY, gameState);
    const right = isBlocking(blockX + 1, blockY, gameState);

    // Add a small buffer to prevent getting too close to walls
    const WALL_BUFFER = 0.001;

    // Handle straight wall collisions
    if (top && toY - blockY < radius) {
        position.y = blockY + radius + WALL_BUFFER;
    }
    if (bottom && blockY + 1 - toY < radius) {
        position.y = blockY + 1 - radius - WALL_BUFFER;
    }
    if (left && toX - blockX < radius) {
        position.x = blockX + radius + WALL_BUFFER;
    }
    if (right && blockX + 1 - toX < radius) {
        position.x = blockX + 1 - radius - WALL_BUFFER;
    }

    // Handle corner collisions with smoother transitions
    const handleCorner = (cornerX, cornerY, isBlocked) => {
        if (!isBlocked) return;

        const dx = toX - cornerX;
        const dy = toY - cornerY;
        const distSquared = dx * dx + dy * dy;

        if (distSquared < radius * radius) {
            const dist = Math.sqrt(distSquared);
            // Add small buffer to prevent sticking
            const scale = (radius + WALL_BUFFER) / Math.max(dist, 0.0001);

            position.x = cornerX + dx * scale;
            position.y = cornerY + dy * scale;
        }
    };

    // Check corners only if we're not already colliding with adjacent walls
    if (isBlocking(blockX - 1, blockY - 1, gameState) && !(top && left)) {
        handleCorner(blockX, blockY, true);
    }
    if (isBlocking(blockX + 1, blockY - 1, gameState) && !(top && right)) {
        handleCorner(blockX + 1, blockY, true);
    }
    if (isBlocking(blockX - 1, blockY + 1, gameState) && !(bottom && left)) {
        handleCorner(blockX, blockY + 1, true);
    }
    if (isBlocking(blockX + 1, blockY + 1, gameState) && !(bottom && right)) {
        handleCorner(blockX + 1, blockY + 1, true);
    }

    return position;
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