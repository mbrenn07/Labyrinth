export let screenWidth = window.innerWidth;
export let screenHeight = window.innerHeight;
export const stripWidth = 2;
export const fov = 80 * Math.PI / 180;
export let viewDist = (screenWidth / 2) / Math.tan(fov / 2);
export let numofrays = Math.ceil(screenWidth / stripWidth);
export const numoftex = 3;

let screenStrips = [];

// Add function to update screen dimensions
export function setScreenDimensions(width, height) {
    screenWidth = width;
    screenHeight = height;
    viewDist = (screenWidth / 2) / Math.tan(fov / 2);
    numofrays = Math.ceil(screenWidth / stripWidth);
}

export function initScreen(screenRef) {
    // Clear existing strips
    screenStrips.forEach(strip => strip.remove());
    screenStrips = [];

    const screen = screenRef.current;
    if (!screen) return;

    screen.style.height = `${screenHeight}px`;
    screen.style.width = `${screenWidth}px`;

    // Create screen strips
    for (let i = 0; i < screenWidth; i += stripWidth) {
        const strip = document.createElement("div");
        strip.style.position = "absolute";
        strip.style.left = `${i}px`;
        strip.style.width = `${stripWidth}px`;
        strip.style.overflow = "hidden";

        const img = new Image();
        img.src = "assets/walls.png";
        img.style.position = "absolute";
        img.prevStyle = {
            height: 0,
            width: 0,
            top: 0,
            left: 0
        };
        strip.appendChild(img);
        strip.img = img;

        const fog = document.createElement("span");
        fog.style.position = "absolute";
        strip.appendChild(fog);
        strip.fog = fog;

        screenStrips.push(strip);
        screen.appendChild(strip);
    }
}

export function castRays(gameState) {
    requestAnimationFrame(() => {
        let stripIdx = 0;

        for (let i = 0; i < numofrays; i++) {
            const rayScreenPos = (-numofrays / 2 + i) * stripWidth;
            const rayViewDist = Math.sqrt(rayScreenPos * rayScreenPos + viewDist * viewDist);
            const rayAngle = Math.asin(rayScreenPos / rayViewDist);

            castRay(
                gameState.current.player.rotation + rayAngle,
                stripIdx++,
                gameState
            );
        }
    });
}

function castRay(rayAngle, stripIdx, gameState) {
    rayAngle %= Math.PI * 2;
    if (rayAngle < 0) rayAngle += Math.PI * 2;

    const right = (rayAngle > Math.PI * 2 * 0.75 || rayAngle < Math.PI * 2 * 0.25);
    const up = (rayAngle < 0 || rayAngle > Math.PI);
    const angleSin = Math.sin(rayAngle);
    const angleCos = Math.cos(rayAngle);

    let distance = 0;
    let xHit = 0, yHit = 0;
    let textureX, wallX, wallY, shadow;

    // Vertical cast
    const slopeVer = angleSin / angleCos;
    const dXVer = right ? 1 : -1;
    const dYVer = dXVer * slopeVer;
    let x = right ? Math.ceil(gameState.current.player.x) : Math.floor(gameState.current.player.x);
    let y = gameState.current.player.y + (x - gameState.current.player.x) * slopeVer;

    while (x >= 0 && x < gameState.current.mapWidth && y >= 0 && y < gameState.current.mapHeight) {
        wallX = x + (right ? 0 : -1);
        wallY = Math.floor(y);

        if (gameState.current.map[wallY][wallX] > 0) {
            const distX = x - gameState.current.player.x;
            const distY = y - gameState.current.player.y;
            distance = distX * distX + distY * distY;
            textureX = y % 1;
            if (!right) textureX = 1 - textureX;
            xHit = x;
            yHit = y;
            shadow = true;
            break;
        }
        x += dXVer;
        y += dYVer;
    }

    // Horizontal cast
    const slopeHor = angleCos / angleSin;
    const dYHor = up ? -1 : 1;
    const dXHor = dYHor * slopeHor;
    y = up ? Math.floor(gameState.current.player.y) : Math.ceil(gameState.current.player.y);
    x = gameState.current.player.x + (y - gameState.current.player.y) * slopeHor;

    while (x >= 0 && x < gameState.current.mapWidth && y >= 0 && y < gameState.current.mapHeight) {
        wallY = y + (up ? -1 : 0);
        wallX = Math.floor(x);

        if (gameState.current.map[wallY][wallX] > 0) {
            const distX = x - gameState.current.player.x;
            const distY = y - gameState.current.player.y;
            const blockDist = distX * distX + distY * distY;

            if (!distance || blockDist < distance) {
                distance = blockDist;
                textureX = x % 1;
                if (up) textureX = 1 - textureX;
                xHit = x;
                yHit = y;
                shadow = true;
            }
            break;
        }
        x += dXHor;
        y += dYHor;
    }

    if (distance) {
        const strip = screenStrips[stripIdx];
        distance = Math.sqrt(distance);
        distance *= Math.cos(gameState.current.player.rotation - rayAngle);

        const height = Math.round(viewDist / distance);
        const width = height * stripWidth;
        const top = Math.round((screenHeight - height) / 2);
        let texX = Math.round(textureX * width);

        if (texX > width - stripWidth) texX = width - stripWidth;
        texX += shadow ? width : 0;

        // Batch DOM updates using transform instead of individual style properties
        strip.style.transform = `translateY(${top}px)`;
        strip.style.height = `${height}px`;

        const img = strip.img;
        // Use transform for image positioning instead of left property
        img.style.transform = `translateX(${-texX}px)`;

        // Only update these if they've changed
        if (img.prevStyle.height !== Math.floor(height * numoftex)) {
            img.style.height = `${Math.floor(height * numoftex)}px`;
            img.prevStyle.height = Math.floor(height * numoftex);
        }
        if (img.prevStyle.width !== Math.floor(width * 2)) {
            img.style.width = `${Math.floor(width * 2)}px`;
            img.prevStyle.width = Math.floor(width * 2);
        }

        // Use opacity instead of rgba for better performance
        strip.fog.style.height = `${Math.floor(height)}px`;
        strip.fog.style.width = `${Math.floor(width * 2)}px`;
        strip.fog.style.background = `rgba(0,0,0,${Math.min(distance / 10, 0.8)})`;

    }
}

export function updateBackground(gameState, ceilingRef) {
    if (ceilingRef.current) {
        ceilingRef.current.style.backgroundPosition = -200 * gameState.current.player.rotation + "px " + "100%";
    }
}