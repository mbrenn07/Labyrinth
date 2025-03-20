// Import refreshNPCsOnLightning from sprites.js
import { refreshNPCsOnLightning } from './sprites';

export let screenWidth = window.innerWidth;
export let screenHeight = window.innerHeight;
export const stripWidth = 2;
export const fov = 80 * Math.PI / 180;
export let viewDist = (screenWidth / 2) / Math.tan(fov / 2);
export let numofrays = Math.ceil(screenWidth / stripWidth);
export const numoftex = 3;
export const MAX_RENDER_DISTANCE = 0; // Reduce if possible

// Lightning effect parameters
let lightningActive = false;
let lightningIntensity = 0;
let lightningFadeSpeed = 0.05;
let gameStateRef = null;
let screenRefGlobal = null;

let screenStrips = [];

// Add function to update screen dimensions
export function setScreenDimensions(width, height) {
    screenWidth = width;
    screenHeight = height;
    viewDist = (screenWidth / 2) / Math.tan(fov / 2);
    numofrays = Math.ceil(screenWidth / stripWidth);
}

export function isPointVisible(startX, startY, targetX, targetY, gameState) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);

    const wallDist = distToWall(startX, startY, angle, gameState);

    return distance < wallDist || Math.abs(distance - wallDist) < 0.1;
}

export function distToWall(startX, startY, rayAngle, gameState) {
    let rayDirX = Math.cos(rayAngle);
    let rayDirY = Math.sin(rayAngle);

    let mapX = Math.floor(startX);
    let mapY = Math.floor(startY);

    let deltaDistX = Math.abs(1 / rayDirX);
    let deltaDistY = Math.abs(1 / rayDirY);

    let stepX, stepY;
    let sideDistX, sideDistY;

    // Initialize step and initial sideDist
    if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (startX - mapX) * deltaDistX;
    } else {
        stepX = 1;
        sideDistX = (mapX + 1 - startX) * deltaDistX;
    }
    if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (startY - mapY) * deltaDistY;
    } else {
        stepY = 1;
        sideDistY = (mapY + 1 - startY) * deltaDistY;
    }

    // DDA
    let hit = false;
    let side;
    for (let i = 0; i < MAX_RENDER_DISTANCE; i++) {
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 0;
        } else {
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 1;
        }
        if (mapX < 0 || mapX >= gameState.current.mapWidth ||
            mapY < 0 || mapY >= gameState.current.mapHeight) break;
        if (gameState.current.map[mapY][mapX] > 0) {
            hit = true;
            break;
        }
    }

    if (!hit) return Infinity;
    const dist = side === 0
        ? (mapX - startX + (1 - stepX) / 2) / rayDirX
        : (mapY - startY + (1 - stepY) / 2) / rayDirY;
    return Math.min(dist, MAX_RENDER_DISTANCE);
}

// Store gameState and screenRef for lightning effects
export function setGameStateAndScreenRef(gameState, screenRef) {
    gameStateRef = gameState;
    screenRefGlobal = screenRef;
}

// Function to start random lightning
function startRandomLightning() {
    // Initial random delay between 30-60 seconds
    const initialDelay = Math.floor(Math.random() * 30000) + 60000;

    setTimeout(triggerRandomLightning, initialDelay);
}

// Function to trigger lightning and schedule the next one
function triggerRandomLightning() {
    // Create lightning with random intensity
    const intensity = 1; // Between 0.7 and 1.0
    const fadeSpeed = 0.01 + (Math.random() * 0.02); // Between 0.03 and 0.05

    // Trigger the lightning effect
    createLightning(intensity, fadeSpeed);

    // Calculate thunder delay based on "distance" - between .5 - 2.5 seconds
    const thunderDelay = Math.floor(Math.random() * 2000) + 500;

    // Play thunder sound after the delay
    setTimeout(() => {
        playThunderSound(thunderDelay);

        // Refresh NPCs after thunder when lightning is at peak intensity
        if (gameStateRef && screenRefGlobal) {
            refreshNPCsOnLightning(gameStateRef, screenRefGlobal);
        }
    }, thunderDelay);

    // Schedule the next lightning (30-60 seconds)
    const nextDelay = Math.floor(Math.random() * 30000) + 60000;
    setTimeout(triggerRandomLightning, nextDelay);
}

function scaleValue(value, oldMin = 500, oldMax = 2000, newMin = 0.4, newMax = 0.9) {
    return ((value - oldMin) / (oldMax - oldMin)) * (newMax - newMin) + newMin;
}

// Function to play thunder sound
function playThunderSound(thunderDelay) {
    // Create a new audio element
    const thunder = new Audio();

    // Choose a random thunder sound from available options
    const thunderSoundNumber = Math.floor(Math.random() * 3) + 1; // For 3 different thunder sounds
    thunder.src = `assets/thunder${thunderSoundNumber}.mp3`;

    // Randomize volume for distance effect
    thunder.volume = Math.max(Math.min(scaleValue(thunderDelay), 1), 0); // Between 0.4 and 0.9

    // Play the thunder sound
    thunder.play().catch(error => {
        console.error("Thunder sound couldn't play. This might be due to browser autoplay restrictions:", error);
    });
}

export function initScreen(screenRef) {
    // Clear existing strips
    screenStrips.forEach(strip => strip.remove());
    screenStrips = [];

    const screen = screenRef.current;
    if (!screen) return;

    screen.style.height = `${screenHeight}px`;
    screen.style.width = `${screenWidth}px`;

    // Create lightning overlay element
    const lightningOverlay = document.createElement("div");
    lightningOverlay.id = "lightningOverlay";
    lightningOverlay.style.position = "absolute";
    lightningOverlay.style.top = "0";
    lightningOverlay.style.left = "0";
    lightningOverlay.style.width = "100%";
    lightningOverlay.style.height = "100%";
    lightningOverlay.style.backgroundColor = "white";
    lightningOverlay.style.pointerEvents = "none";
    lightningOverlay.style.zIndex = "9999";
    lightningOverlay.style.opacity = "0";
    screen.appendChild(lightningOverlay);

    if (!screenRefGlobal) {
        startRandomLightning();
    }

    // Set the global screenRef for later use
    screenRefGlobal = screenRef;


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
    // Store gameState reference for lightning effects
    gameStateRef = gameState;

    requestAnimationFrame(() => {
        let stripIdx = 0;

        // Update lightning effect if active
        updateLightningEffect();

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

        if (gameState.current.map[wallY][wallX] === 1) {
            const distX = x - gameState.current.player.x;
            const distY = y - gameState.current.player.y;
            distance = distX * distX + distY * distY;
            textureX = y % 1;
            if (!right) textureX = 1 - textureX;
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

        if (gameState.current.map[wallY][wallX] === 1) {
            const distX = x - gameState.current.player.x;
            const distY = y - gameState.current.player.y;
            const blockDist = distX * distX + distY * distY;

            if (!distance || blockDist < distance) {
                distance = blockDist;
                textureX = x % 1;
                if (up) textureX = 1 - textureX;
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

        // Assign z-index based on distance (closer walls have higher z-index)
        const zIndex = Math.floor(1000 - distance * 10); // Adjust the multiplier as needed
        strip.style.zIndex = zIndex;

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

        // Apply lightning effect to the fog overlay if active
        let fogOpacity = Math.min(distance / 3, 0.8);
        if (lightningActive) {
            // Reduce fog opacity during lightning (makes things brighter)
            fogOpacity = Math.max(0, fogOpacity - lightningIntensity * 0.5);
        }

        // Use opacity instead of rgba for better performance
        strip.fog.style.height = `${Math.floor(height)}px`;
        strip.fog.style.width = `${Math.floor(width * 2)}px`;
        strip.fog.style.background = `rgba(0,0,0,${fogOpacity})`;
    }
}

// Update the background with lightning effect if active
export function updateBackground(gameState, ceilingRef) {
    if (ceilingRef.current) {
        // Base background position
        const basePosition = -200 * gameState.current.player.rotation + "px " + "100%";

        if (lightningActive && lightningIntensity > 0.1) {
            // Apply a brighter filter during lightning
            const brightness = 100 + Math.floor(lightningIntensity * 75);
            ceilingRef.current.style.filter = `brightness(${brightness}%)`;
        } else {
            // Reset filter when no lightning
            ceilingRef.current.style.filter = "brightness(100%)";
        }

        ceilingRef.current.style.backgroundPosition = basePosition;
    }
}

// Create a simple lightning flash effect
export function createLightning(intensity = 1.0, fadeSpeed = 0.05) {
    lightningActive = true;
    lightningIntensity = intensity;
    lightningFadeSpeed = fadeSpeed;

    // Apply lightning flash to overlay
    const overlay = document.getElementById("lightningOverlay");
    if (overlay) {
        overlay.style.opacity = `${lightningIntensity}`;
    }
}

// Update lightning effect each frame
function updateLightningEffect() {
    if (lightningActive) {
        if (lightningIntensity > 0) {
            lightningIntensity -= lightningFadeSpeed;

            // Update overlay opacity
            const overlay = document.getElementById("lightningOverlay");
            if (overlay) {
                overlay.style.opacity = `${Math.max(0, lightningIntensity)}`;
            }

            if (lightningIntensity <= 0) {
                lightningActive = false;
                lightningIntensity = 0;

                // Reset overlay
                if (overlay) {
                    overlay.style.opacity = "0";
                }
            }
        }
    }
}