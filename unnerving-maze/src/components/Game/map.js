import mapJson from "./map.json"
export const map = mapJson;

const mapScale = 8;

export function drawMap(gameState, minimapRef, objectsRef) {
    if (!minimapRef.current || !objectsRef.current) return;

    const miniMap = minimapRef.current;
    const objects = objectsRef.current;

    // Calculate map dimensions from the map array
    gameState.current.mapWidth = map[0].length;
    gameState.current.mapHeight = map.length;

    // Set canvas dimensions
    miniMap.width = gameState.current.mapWidth * mapScale;
    miniMap.height = gameState.current.mapHeight * mapScale;
    objects.width = miniMap.width;
    objects.height = miniMap.height;
}

export function updateMap(gameState, minimapRef, objectsRef) {
    if (!minimapRef.current || !objectsRef.current) return;

    const objects = objectsRef.current;
    const objectCtx = objects.getContext("2d");

    // Clear previous frame
    objectCtx.clearRect(0, 0, objects.width, objects.height);

}

// Original isBlocking function adapted for React
export function isBlocking(x, y, gameState) {
    if (y < 0 || y >= gameState.current.mapHeight || x < 0 || x >= gameState.current.mapWidth)
        return true;
    if (gameState.current.map[y][x] !== 0)
        return true;
    if (gameState.current.spritePosition[y]?.[x]?.block)
        return true;
    return false;
}