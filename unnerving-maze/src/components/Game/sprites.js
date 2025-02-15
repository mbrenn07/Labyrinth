
// Import map from your map.js component
import { map } from './map';
import { screenWidth, screenHeight, viewDist } from './renderer';

export const itemTypes = [
    { img: 'assets/bush.png', block: false },
];

export function initSprites(gameState, screenRef) {
    gameState.current.mapSprites = [];
    gameState.current.spritePosition = Array.from({ length: gameState.current.mapHeight }, () => []);

    addItems(gameState);

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
        if (sprite.visible) {
            const dx = sprite.x + 0.5 - gameState.current.player.x;
            const dy = sprite.y + 0.5 - gameState.current.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) - gameState.current.player.rotation;

            const size = viewDist / (Math.cos(angle) * distance);
            const xPos = Math.tan(angle) * viewDist;

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