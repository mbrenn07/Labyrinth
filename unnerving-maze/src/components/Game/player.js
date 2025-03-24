import { isBlocking } from './map';

// At the top of the file
const BASE_MOVE_SPEED = 2.5; // Units per second
const ROTATION_SPEED = 2; // Radians per second
const COLLISION_RADIUS = 0.35;
const SUBSTEPS = 1; // Increased collision checks per frame

export function initPlayer() {
    return {
        x: 25,
        y: 24,
        rotation: 0,
        velocity: { x: 0, y: 0 }, // Add velocity tracking
        moveSpeed: 0.075,
        rotationSpeed: 5,
        path: [],
        spritesCollected: 0,
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


    // Check for sprite collisions
    checkSpriteCollisions(gameState); // Add this line
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

function checkSpriteCollisions(gameState) {
    const { player } = gameState.current;
    const COLLISION_RADIUS = 0.35;

    gameState.current.sprites.forEach(sprite => {
        if (sprite.type === 1 && !sprite.collected) { // Type 1 is the item
            const spriteCenterX = sprite.x + 0.5;
            const spriteCenterY = sprite.y + 0.5;
            const dx = spriteCenterX - player.x;
            const dy = spriteCenterY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < COLLISION_RADIUS) {
                handlePickup(sprite, gameState);
            }
        }
    });
}

function handlePickup(sprite, gameState) {
    // Mark sprite as collected
    sprite.collected = true;
    gameState.current.player.spritesCollected++
    console.log("hi")

    // Remove from mapSprites
    const mapIndex = gameState.current.mapSprites.findIndex(s => s === sprite);
    if (mapIndex !== -1) gameState.current.mapSprites.splice(mapIndex, 1);

    // Remove from sprites array and DOM
    const spriteIndex = gameState.current.sprites.findIndex(s => s === sprite);
    if (spriteIndex !== -1) {
        const [removed] = gameState.current.sprites.splice(spriteIndex, 1);
        removed.img.remove();
        delete gameState.current.spritePosition[removed.y][removed.x];
    }

    if (gameState.current.player.spritesCollected >= 3) {
        localStorage.setItem("path", JSON.stringify(gameState.current.player.path))
        gameState.current.completed = true
    } else {
        const pickupSound = new Audio('assets/pick-up.mp3');
        pickupSound.volume = 0.5; // Optional: adjust volume (0.0 to 1.0)
        pickupSound.play().catch(error => {
            console.error('Failed to play pickup sound:', error);
        });
    }

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