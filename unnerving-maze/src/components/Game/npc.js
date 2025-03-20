export class NPC {
    constructor(startX, startY, path) {
        this.x = startX;
        this.y = startY;
        this.path = path;
        this.currentPathIndex = 0;
        this.lastMoveTime = performance.now();
        this.speed = .5 + (Math.random() / 10); // Pixels per second

        // Current target position
        this.targetX = path[0][0];
        this.targetY = path[0][1];

        // For smooth movement
        this.isMoving = false;
        this.moveProgress = 0;
        this.startX = startX;
        this.startY = startY;
        this.currentMoveDuration = 0; // Milliseconds per movement
    }

    update(currentTime) {
        if (this.isMoving) {
            const deltaTime = currentTime - this.lastMoveTime;
            this.moveProgress = Math.min(deltaTime / this.currentMoveDuration, 1);

            // Interpolate position smoothly
            this.x = this.startX + (this.targetX - this.startX) * this.moveProgress;
            this.y = this.startY + (this.targetY - this.startY) * this.moveProgress;

            if (this.moveProgress >= 1) {
                // Snap to target and immediately start next movement
                this.isMoving = false;
                this.x = this.targetX;
                this.y = this.targetY;
                this.lastMoveTime = currentTime;
                this.moveToNextPoint();
            }
        } else {
            // Start moving initially or if interrupted
            this.moveToNextPoint();
        }
    }

    moveToNextPoint() {
        // Update to next path point
        this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
        const nextX = this.path[this.currentPathIndex][0];
        const nextY = this.path[this.currentPathIndex][1];

        // Calculate movement parameters
        this.startX = this.x;
        this.startY = this.y;
        this.targetX = nextX;
        this.targetY = nextY;

        const dx = this.targetX - this.startX;
        const dy = this.targetY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate duration based on distance and speed
        this.currentMoveDuration = (distance / this.speed) * 1000;

        // Initialize movement
        this.isMoving = true;
        this.moveProgress = 0;
        this.lastMoveTime = performance.now();
    }
}