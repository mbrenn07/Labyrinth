import React, { useEffect, useRef, useState } from 'react';
import { initScreen, castRays, updateBackground, setScreenDimensions } from './renderer';
import { move, initPlayer, addKeys } from './player';
import { drawMap, updateMap } from './map';
import { initSprites, clearSprites, renderSprites } from './sprites';
import { map } from "./map"

export default function Game() {
    const screenRef = useRef(null);
    const minimapRef = useRef(null);
    const objectsRef = useRef(null);
    const ceilingRef = useRef(null);
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    // Game state refs
    const gameState = useRef({
        player: initPlayer(),
        sprites: [],
        spritePosition: [],
        map: map,
        keys: {}
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
            // Update renderer dimensions
            setScreenDimensions(window.innerWidth, window.innerHeight);
            // Reinitialize screen with new dimensions
            initScreen(screenRef, minimapRef, objectsRef, ceilingRef);
        };

        // Initial setup
        handleResize();

        // Add resize listener
        window.addEventListener('resize', handleResize);

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
            window.removeEventListener('resize', handleResize);
        };

    }, []);

    const Ceiling = () => (
        <div
            ref={ceilingRef}
            id="ceiling"
            style={{
                position: 'absolute',
                width: '100%',
                height: '50%',
                backgroundImage: 'url("/assets/ceiling.jpg")',
                pointerEvents: 'none'
            }}
        />
    );

    const Floor = () => (
        <div
            id="floor"
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to bottom, #000 50%, #42301c 100%)'
            }}
        />
    );

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0
        }}>
            <div id="screen" ref={screenRef} style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <Floor />
                <Ceiling />
                <div id="map" style={{
                    position: 'fixed',
                    top: '10px',
                    left: '10px',
                    zIndex: 99999,
                }}>
                    <canvas ref={minimapRef} />
                    <canvas ref={objectsRef} />
                </div>
            </div>
        </div>
    );
}