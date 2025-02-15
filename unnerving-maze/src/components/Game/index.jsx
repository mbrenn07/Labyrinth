import React, { useEffect, useRef } from 'react';
import { initScreen, castRays, updateBackground } from './renderer';
import { move, initPlayer, addKeys } from './player';
import { drawMap, updateMap } from './map';
import { initSprites, clearSprites, renderSprites } from './sprites';
import { map } from "./map"

export default function Game() {
    const screenRef = useRef(null);
    const minimapRef = useRef(null);
    const objectsRef = useRef(null);
    const ceilingRef = useRef(null);

    // Game state refs
    const gameState = useRef({
        player: initPlayer(),
        sprites: [],
        spritePosition: [],
        map: map,
        keys: {}
    });

    useEffect(() => {
        // Initialize game
        initScreen(screenRef, minimapRef, objectsRef, ceilingRef);
        initSprites(gameState, screenRef);
        drawMap(gameState, minimapRef, objectsRef);

        // Game loop
        let lastTime = 0;
        let animationFrameId;

        const gameLoop = (timestamp) => {
            const delta = timestamp - lastTime;
            lastTime = timestamp;

            // Update game state
            move(gameState, delta);
            updateMap(gameState, minimapRef, objectsRef);
            clearSprites(gameState);
            castRays(gameState, screenRef);
            renderSprites(gameState);
            updateBackground(gameState, ceilingRef);

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        // Event listeners
        const { handleKeyDown, handleKeyUp } = addKeys(gameState);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };

    }, []);

    return (
        <div>
            <div id="screen" ref={screenRef} style={{
                width: '1024px',
                height: '768px',
                position: 'relative',
                overflow: 'hidden'
            }} />
            <div id="map" style={{ position: 'fixed', top: 20, left: 20 }}>
                <canvas ref={minimapRef} />
                <canvas ref={objectsRef} />
            </div>
            <div id="ceiling" ref={ceilingRef} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '50%',
                pointerEvents: 'none'
            }} />
        </div>
    );
}