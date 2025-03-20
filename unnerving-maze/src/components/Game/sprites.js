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

// Audio context for handling all NPC sounds
let audioContext;

async function createCompositeDoll(faceUrl) {
    return new Promise((resolve, reject) => {
        const dollImg = new Image();
        dollImg.src = 'assets/doll.png';
        dollImg.onload = () => {
            const faceImg = new Image();
            faceImg.crossOrigin = "anonymous";
            faceImg.src = faceUrl;
            faceImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = dollImg.width;
                canvas.height = dollImg.height;
                const ctx = canvas.getContext('2d');

                // Create temporary canvas for pixelation
                const pixelation = 2; // Higher = more pixelated
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');

                // Set scaled dimensions
                const scaledWidth = 50 / pixelation;
                const scaledHeight = 50 / pixelation;
                tempCanvas.width = scaledWidth;
                tempCanvas.height = scaledHeight;

                // Draw face at low resolution
                tempCtx.imageSmoothingEnabled = false;
                tempCtx.drawImage(
                    faceImg,
                    0, 0,          // Source XY
                    faceImg.width, // Source width
                    faceImg.height,// Source height
                    0, 0,          // Destination XY
                    scaledWidth,    // Scaled width
                    scaledHeight   // Scaled height
                );

                // Draw doll base
                ctx.drawImage(dollImg, 0, 0);

                // Draw pixelated face (disable smoothing for crisp pixels)
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                    tempCanvas,
                    0, 0,             // Source XY
                    scaledWidth,     // Source width
                    scaledHeight,    // Source height
                    430, 10,          // Destination XY (adjust to match doll)
                    200, 200           // Final face size
                );

                resolve(canvas.toDataURL());
            };
            faceImg.onerror = reject;
        };
        dollImg.onerror = reject;
    });
}

// New function to convert base64 to audio buffer
async function base64ToAudioBuffer(base64String) {
    // Remove data URL prefix if it exists
    const base64Data = base64String.replace(/^data:audio\/\w+;base64,/, "");

    // Convert base64 to binary
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create audio buffer from binary data
    if (!audioContext) {
        // Initialize audio context if not already done
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    return await audioContext.decodeAudioData(bytes.buffer);
}

// Function to play audio with distance-based volume
function playNPCSound(npc, player) {
    if (!npc.audioBuffer || !audioContext) return;

    // Calculate distance from player to NPC
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Maximum distance at which sound is audible
    const MAX_AUDIBLE_DISTANCE = 10;

    // Maximum volume you want (e.g., 0.5 instead of 1)
    const MAX_VOLUME = 0.2;

    // Only play if NPC is within audible range
    if (distance <= MAX_AUDIBLE_DISTANCE) {
        // Calculate volume based on distance (inverse relationship)
        // Volume ranges from 1 (at distance 0) to 0 (at MAX_AUDIBLE_DISTANCE)
        const volume = Math.max(0, MAX_VOLUME * (1 - (distance / MAX_AUDIBLE_DISTANCE)));

        // Create audio source
        const source = audioContext.createBufferSource();
        source.buffer = npc.audioBuffer;

        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Play the sound
        source.start(0);
    }
}

// Function to schedule random sound playback for all NPCs
function scheduleNPCSounds(gameState) {
    // Loop through each NPC
    gameState.current.npcs.forEach(npc => {
        // Don't schedule if NPC already has a scheduled timeout
        if (npc.soundTimeoutId) return;

        // Random interval between 30-45 seconds
        const randomInterval = 30000 + Math.random() * 15000;

        // Schedule the sound
        npc.soundTimeoutId = setTimeout(() => {
            // Play the sound
            playNPCSound(npc, gameState.current.player);

            // Clear the timeout ID
            npc.soundTimeoutId = null;

            // Schedule the next sound
            scheduleNPCSounds(gameState);
        }, randomInterval);
    });
}

export async function initSprites(gameState, screenRef) {
    // Initialize audio context on user interaction
    document.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }, { once: true });

    gameState.current.initTime = Date.now();
    gameState.current.mapSprites = [];
    gameState.current.spritePosition = Array.from({ length: gameState.current.mapHeight }, () => []);

    gameState.current.npcs = [];

    addItems(gameState);

    await addNPCs(gameState, screenRef);

    // Start the sound scheduling after NPCs are loaded
    scheduleNPCSounds(gameState);
}

// New function to add NPCs
export async function addNPCs(gameState, screenRef) {
    const data = await instance.get("/players/random");

    for (const player of data.data) {
        //if I want higher quality paths, i need better collision logic
        let path = JSON.parse(player.path).map((pathItem) => {
            let pathX = parseFloat(pathItem.x);
            let pathY = parseFloat(pathItem.y);

            const trimPath = (pathDimension) => {
                const pathInt = Math.trunc(pathDimension)
                let precisePath = pathDimension - pathInt
                if (precisePath > .3 && precisePath <= .5) {
                    precisePath = .3
                } else if (precisePath > .5 && precisePath < .7) {
                    precisePath = .7
                }
                return pathInt + precisePath
            }

            //anything above .6 is bad, anything below .4 is bad
            //.6 - 1.4 is ok
            //bad zone: 1.4 - 1.6
            return [trimPath(pathX), trimPath(pathY)]
        });

        const randomIndex = Math.floor(Math.random() * path.length);
        const npc = new NPC(path[randomIndex][0], path[randomIndex][1], path);

        // Add audio processing for this NPC if player has audio data
        if (player.sound) {
            try {
                npc.audioBuffer = await base64ToAudioBuffer(player.sound);
                npc.soundTimeoutId = null; // Initialize timeout ID
            } catch (error) {
                console.error('Failed to process audio:', error);
                // Continue without audio for this NPC
            }
        }

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
    }

    const screen = screenRef.current;

    // Create new array for sprites if it doesn't exist yet
    if (!gameState.current.sprites) {
        gameState.current.sprites = [];
    }

    // Process each sprite in mapSprites
    for (const sprite of gameState.current.mapSprites) {
        // Skip if not an NPC and we already have sprites (for static elements)
        if (!sprite.isNPC && gameState.current.sprites.length > 0) {
            continue;
        }

        let type = "";
        let block = false;
        const img = new Image();

        if (sprite.type !== undefined) {
            type = itemTypes[sprite.type];
            block = type.block;
            img.src = type.img;
        } else {
            if (sprite.isNPC) {
                try {
                    const compositeUrl = await createCompositeDoll(sprite.img);
                    img.src = compositeUrl;
                } catch (error) {
                    console.error('Composite failed:', error);
                    continue;
                }
            } else {
                img.src = sprite.img;
            }
            block = sprite.block;
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

        gameState.current.sprites.push(spriteObj);
    }
}

// Update the refreshNPCsOnLightning function to handle audio cleanup
export async function refreshNPCsOnLightning(gameState, screenRef) {
    // Stop all sound timeouts before removing NPCs
    gameState.current.npcs.forEach(npc => {
        if (npc.soundTimeoutId) {
            clearTimeout(npc.soundTimeoutId);
            npc.soundTimeoutId = null;
        }
    });

    // Remove existing NPCs
    removeNPCs(gameState, screenRef);

    // Add new NPCs
    await addNPCs(gameState, screenRef);

    // Restart sound scheduling
    scheduleNPCSounds(gameState);
}

// Helper function to remove NPCs
function removeNPCs(gameState, screenRef) {
    const screen = screenRef.current;

    // Filter out NPCs from sprites and remove their images
    gameState.current.sprites = gameState.current.sprites.filter(sprite => {
        if (sprite.isNPC) {
            // Remove the image element from the DOM
            if (sprite.img && screen.contains(sprite.img)) {
                screen.removeChild(sprite.img);
            }
            return false;
        }
        return true;
    });

    // Remove NPCs from mapSprites
    gameState.current.mapSprites = gameState.current.mapSprites.filter(sprite => !sprite.isNPC);

    // Clear NPCs array
    gameState.current.npcs = [];

    // Update sprite positions
    gameState.current.spritePosition = gameState.current.spritePosition.map(row =>
        row.filter(sprite => !sprite || !sprite.isNPC)
    );
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

// Update render function to also update audio as player moves
export function renderSprites(gameState) {
    // Sort sprites by distance for proper rendering order (furthest first)
    gameState.current.sprites.sort((a, b) => {
        const dxa = a.x + 0.5 - gameState.current.player.x;
        const dya = a.y + 0.5 - gameState.current.player.y;
        const dxb = b.x + 0.5 - gameState.current.player.x;
        const dyb = b.y + 0.5 - gameState.current.player.y;
        return (dxb * dxb + dyb * dyb) - (dxa * dxa + dya * dya);
    });

    for (let spriteIndex in gameState.current.sprites) {
        const sprite = gameState.current.sprites[spriteIndex]
        const SECONDS_BEFORE_VISIBLE = 0
        if (sprite.isNPC && Date.now() - gameState.current.initTime <= SECONDS_BEFORE_VISIBLE * 1000) {
            continue
        }

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
            let size = viewDist / (Math.cos(spriteAngle) * distance);
            const scaleFactor = 0.75; // Match your size scaling factor
            if (sprite.isNPC) {
                size *= scaleFactor; // Make NPCs twice as large
            }

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
            let newTop;
            if (sprite.isNPC) {
                const verticalOffset = size * (1 - scaleFactor); // Push sprite down
                newTop = (screenHeight - size) / 2 + verticalOffset;
            } else {
                newTop = (screenHeight - size) / 2;
            }

            if (newTop !== prevStyle.top) {
                img.style.top = `${newTop}px`;
                prevStyle.top = newTop;
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
    }
}