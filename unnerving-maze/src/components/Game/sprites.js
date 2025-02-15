
// Import map from your map.js component
import { map } from './map';
import { screenWidth, screenHeight, viewDist, distToWall, fov } from './renderer';
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
        [10, 3.5],
        [9, 3.5],
        [9, 2.5],
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
            npcRef: npc // Reference to NPC object
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
            // Check if sprite is blocked by a wall
            const distanceToWall = distToWall(
                gameState.current.player.x,
                gameState.current.player.y,
                Math.atan2(dy, dx),
                gameState
            );

            // Sprite is visible if it's closer than the nearest wall
            sprite.visible = distance < distanceToWall || Math.abs(distance - distanceToWall) < 0.1;
        } else {
            sprite.visible = false;
        }

        if (sprite.visible) {
            const size = sprite.isNPC ?
                (viewDist / (Math.cos(spriteAngle) * distance)) * 1.5 :
                viewDist / (Math.cos(spriteAngle) * distance);

            const xPos = Math.tan(spriteAngle) * viewDist;

            const img = sprite.img;
            img.style.display = "block";
            img.style.left = `${(screenWidth / 2 + xPos - size / 2)}px`;
            img.style.top = `${(screenHeight - size) / 2}px`;
            img.style.width = `${size}px`;
            img.style.height = `${size}px`;
            img.style.filter = `brightness(${100 - 15 * distance}%)`;
            img.style.zIndex = `${Math.floor(size)}`;
        } else {
            sprite.img.style.display = "none";
        }
    });
}