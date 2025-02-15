
// Import map from your map.js component
import { map } from './map';
import { screenWidth, screenHeight, viewDist, isPointVisible, fov, stripWidth, numofrays, distToWall } from './renderer';
import { NPC } from './npc';

export const itemTypes = [
    { img: 'assets/bush.png', block: false },
];

export function initSprites(gameState, screenRef) {
    gameState.current.mapSprites = [];
    gameState.current.spritePosition = Array.from({ length: gameState.current.mapHeight }, () => []);

    gameState.current.npcs = [];
    // Example NPC path
    const examplePath = [
        [10, 11],
        [9, 11],
        // [9, 2.5],
    ];

    // Create an NPC
    const npc = new NPC(examplePath[0][0], examplePath[0][1], examplePath);
    gameState.current.npcs.push(npc);

    addItems(gameState);

    gameState.current.npcs.forEach(npc => {
        gameState.current.mapSprites.push({
            type: 0, // NPC sprite type
            x: npc.x,
            y: npc.y,
            isNPC: true,
            npcRef: npc, // Reference to NPC object
            prevStyle: {}
        });
    });

    const screen = screenRef.current;
    gameState.current.sprites = gameState.current.mapSprites.map(sprite => {
        const type = itemTypes[sprite.type];
        const img = new Image();
        img.src = type.img;
        img.style.display = "none";
        img.style.position = "absolute";
        img.style.overflow = "hidden";

        const spriteObj = {
            ...sprite,
            visible: false,
            block: type.block,
            img
        };

        if (!gameState.current.spritePosition[sprite.y]) {
            gameState.current.spritePosition[sprite.y] = [];
        }
        gameState.current.spritePosition[sprite.y][sprite.x] = spriteObj;
        screen.appendChild(img);

        return spriteObj;
    });
}

function addItems(gameState) {
    for (let y = 0; y < gameState.current.mapHeight; y++) {
        for (let x = 0; x < gameState.current.mapWidth; x++) {
            if (map[y][x] === 0 && Math.random() * 100 < 2) {
                gameState.current.mapSprites.push({
                    type: 0,
                    x: x,
                    y: y
                });
            }
        }
    }
}

export function clearSprites(gameState) {
    gameState.current.sprites.forEach(sprite => {
        sprite.visible = false;
        sprite.img.style.display = "none";
    });
}

export function renderSprites(gameState) {
    // Sort sprites by distance for proper rendering order (furthest first)
    gameState.current.sprites.sort((a, b) => {
        const dxa = a.x + 0.5 - gameState.current.player.x;
        const dya = a.y + 0.5 - gameState.current.player.y;
        const dxb = b.x + 0.5 - gameState.current.player.x;
        const dyb = b.y + 0.5 - gameState.current.player.y;
        return (dxb * dxb + dyb * dyb) - (dxa * dxa + dya * dya);
    });

    gameState.current.sprites.forEach(sprite => {
        const dx = sprite.x + 0.5 - gameState.current.player.x;
        const dy = sprite.y + 0.5 - gameState.current.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) - gameState.current.player.rotation;

        // Calculate angle relative to player's view
        let spriteAngle = angle;
        while (spriteAngle < -Math.PI) spriteAngle += 2 * Math.PI;
        while (spriteAngle >= Math.PI) spriteAngle -= 2 * Math.PI;

        // Only process sprites within field of view
        if (Math.abs(spriteAngle) < fov / 1.5) {
            const size = viewDist / (Math.cos(spriteAngle) * distance);

            const xPos = Math.tan(spriteAngle) * viewDist;
            const screenX = (screenWidth / 2 + xPos - size / 2);

            // Calculate the sprite's screen position in strips
            const leftStrip = Math.floor(screenX / stripWidth);
            const rightStrip = Math.floor((screenX + size) / stripWidth);

            let isVisible = false;
            const visibilityStrips = [];

            // Check visibility for each vertical strip of the sprite
            for (let strip = leftStrip; strip <= rightStrip; strip++) {
                if (strip < 0 || strip >= numofrays) continue;

                // Calculate the ray angle for this strip
                const rayScreenPos = (-numofrays / 2 + strip) * stripWidth;
                const rayViewDist = Math.sqrt(rayScreenPos * rayScreenPos + viewDist * viewDist);
                const rayAngle = Math.asin(rayScreenPos / rayViewDist) + gameState.current.player.rotation;

                // Get wall distance for this strip
                const wallDist = distToWall(
                    gameState.current.player.x,
                    gameState.current.player.y,
                    rayAngle,
                    gameState
                );

                // If sprite is closer than wall, this strip is visible
                if (distance < wallDist) {
                    isVisible = true;
                    visibilityStrips.push(strip);
                }
            }

            sprite.visible = isVisible;

            if (sprite.visible) {
                const img = sprite.img;
                const prevStyle = sprite.prevStyle || {};

                img.style.display = 'block';

                // Assign z-index based on distance (closer sprites have higher z-index)
                const zIndex = Math.floor(1000 - distance * 10); // Adjust the multiplier as needed
                img.style.zIndex = zIndex;

                // Only update styles if they have changed
                if (size !== prevStyle.height) {
                    img.style.height = `${size}px`;
                    prevStyle.height = size;
                }
                if ((size * (sprite.numOfStates || 1)) !== prevStyle.width) {
                    img.style.width = `${size * (sprite.numOfStates || 1)}px`;
                    prevStyle.width = size * (sprite.numOfStates || 1);
                }
                if (((screenHeight - size) / 2) !== prevStyle.top) {
                    img.style.top = `${(screenHeight - size) / 2}px`;
                    prevStyle.top = (screenHeight - size) / 2;
                }
                if ((screenWidth / 2 + xPos - size / 2 - size * (sprite.state || 0)) !== prevStyle.left) {
                    img.style.left = `${screenWidth / 2 + xPos - size / 2 - size * (sprite.state || 0)}px`;
                    prevStyle.left = screenWidth / 2 + xPos - size / 2 - size * (sprite.state || 0);
                }
                if (`brightness(${100 - 15 * distance}%)` !== prevStyle.filter) {
                    img.style.filter = `brightness(${100 - 15 * distance}%)`;
                    prevStyle.filter = `brightness(${100 - 15 * distance}%)`;
                }
                if ('block' !== prevStyle.display) {
                    img.style.display = 'block';
                    prevStyle.display = 'block';
                }

                sprite.prevStyle = prevStyle;
            } else {
                sprite.img.style.display = "none";
            }
        } else {
            sprite.visible = false;
            sprite.img.style.display = "none";
        }
    });
}