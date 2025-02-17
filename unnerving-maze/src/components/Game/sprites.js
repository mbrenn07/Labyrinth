
// Import map from your map.js component
import { map } from './map';
import { screenWidth, screenHeight, viewDist, fov } from './renderer';
import { NPC } from './npc';
import axios from 'axios';

export const itemTypes = [
    { img: 'assets/bush.png', block: false },
    { img: 'assets/cassette.png', block: false },
];

const instance = axios.create({
    baseURL: "https://labyrinth-backend-1095352764453.us-east4.run.app",
    timeout: undefined,
});

export async function initSprites(gameState, screenRef) {
    gameState.current.mapSprites = [];
    gameState.current.spritePosition = Array.from({ length: gameState.current.mapHeight }, () => []);

    gameState.current.npcs = [];

    addItems(gameState);

    const data = await instance.get("/players/random")
    data.data.forEach((player) => {
        const path = JSON.parse(player.path).map((pathItem) => [parseFloat(pathItem.x), parseFloat(pathItem.y)])
        const npc = new NPC(path[0][0], path[0][1], path);
        gameState.current.npcs.push(npc);
        gameState.current.mapSprites.push({
            block: false,
            img: player.picture,
            x: npc.x,
            y: npc.y,
            isNPC: true,
            npcRef: npc, // Reference to NPC object
            prevStyle: {}
        });
    })

    const screen = screenRef.current;
    gameState.current.sprites = gameState.current.mapSprites.map(sprite => {
        let type = ""
        let block = false
        const img = new Image();

        if (sprite.type !== undefined) {
            type = itemTypes[sprite.type];
            block = type.block
            img.src = type.img
        } else {
            img.src = sprite.img;
            block = sprite.block
        }
        img.style.display = "none";
        img.style.position = "absolute";
        img.style.overflow = "hidden";

        const spriteObj = {
            ...sprite,
            block: block,
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
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
            if (map[y][x] === 2) {
                gameState.current.mapSprites.push({
                    type: 1,
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
            sprite.visible = false;
            sprite.img.style.display = "none";
        }
    });
}