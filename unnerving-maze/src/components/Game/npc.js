export class NPC {
    constructor(startX, startY, path) {
        this.x = startX;
        this.y = startY;
        this.path = path;
        this.currentPathIndex = 0;
        this.lastMoveTime = performance.now();
        this.moveInterval = 100; // 1 second between moves
        this.speed = 1; // Units per second for smooth movement

        // Current target position
        this.targetX = path[0][0];
        this.targetY = path[0][1];

        // For smooth movement
        this.isMoving = false;
        this.moveProgress = 0;
        this.startX = startX;
        this.startY = startY;
    }

    update(currentTime) {
        // Update smooth movement
        if (this.isMoving) {
            const deltaTime = (currentTime - this.lastMoveTime) / this.moveInterval;
            this.moveProgress = Math.min(deltaTime, 1);

            // Interpolate position
            this.x = this.startX + (this.targetX - this.startX) * this.moveProgress;
            this.y = this.startY + (this.targetY - this.startY) * this.moveProgress;

            // Check if we've reached the target
            if (this.moveProgress >= 1) {
                this.isMoving = false;
                this.x = this.targetX;
                this.y = this.targetY;
                this.lastMoveTime = currentTime;
            }
        } else if (currentTime - this.lastMoveTime >= this.moveInterval) {
            // Start moving to next point
            this.moveToNextPoint();
        }
    }

    moveToNextPoint() {
        // Store start position
        this.startX = this.x;
        this.startY = this.y;

        // Update target position
        this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
        this.targetX = this.path[this.currentPathIndex][0];
        this.targetY = this.path[this.currentPathIndex][1];

        // Start movement
        this.isMoving = true;
        this.moveProgress = 0;
        this.lastMoveTime = performance.now();
    }
}