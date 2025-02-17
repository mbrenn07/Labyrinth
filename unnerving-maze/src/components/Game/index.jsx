import React, { useEffect, useRef } from 'react';
import { initScreen, castRays, updateBackground, setScreenDimensions } from './renderer';
import { move, initPlayer, addKeys } from './player';
import { drawMap, updateMap, map } from './map';
import { initSprites, clearSprites, renderSprites } from './sprites';
import { useNavigate } from "react-router-dom";

export default function Game() {
    const screenRef = useRef(null);
    const minimapRef = useRef(null);
    const objectsRef = useRef(null);
    const ceilingRef = useRef(null);

    const navigate = useNavigate();

    // Game state refs
    const gameState = useRef({
        player: initPlayer(),
        completed: false,
        sprites: [],
        spritePosition: [],
        map: map,
        keys: {}
    });

    useEffect(() => {
        const handleResize = () => {
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

            // Update NPCs
            gameState.current.npcs.forEach(npc => {
                npc.update(timestamp);
            });

            // Update NPC sprites
            gameState.current.sprites.forEach(sprite => {
                if (sprite.isNPC && sprite.npcRef) {
                    sprite.x = sprite.npcRef.x;
                    sprite.y = sprite.npcRef.y;
                }
            });

            // Update game state
            move(gameState, delta);
            updateMap(gameState, minimapRef, objectsRef);
            clearSprites(gameState);
            castRays(gameState, screenRef);
            renderSprites(gameState);
            updateBackground(gameState, ceilingRef);

            if (gameState.current.completed) {
                navigate("/audio")
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        // Event listeners
        const { handleKeyDown, handleKeyUp } = addKeys(gameState);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const samplePlayerPosition = setInterval(() => {
            if (gameState.current?.player) {
                gameState.current.player.path.push({ x: gameState.current.player.x.toFixed(2), y: gameState.current.player.y.toFixed(2) })
            }
        }, 100)

        return () => {
            clearInterval(samplePlayerPosition)
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