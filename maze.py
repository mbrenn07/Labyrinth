import numpy as np
import random
import cv2


def generate_large_maze(width, height):
    # Initialize the grid with walls (1s)
    maze = np.ones((height, width), dtype=int)

    # Stack for iterative DFS
    stack = [(1, 1)]
    maze[1, 1] = 0  # Start position

    directions = [(0, 2), (2, 0), (0, -2), (-2, 0)]

    while stack:
        x, y = stack[-1]
        random.shuffle(directions)
        carved = False

        for dx, dy in directions:
            nx, ny = x + dx, y + dy

            if 0 < nx < width - 1 and 0 < ny < height - 1 and maze[ny][nx] == 1:
                maze[ny - dy // 2][nx - dx // 2] = 0  # Remove wall
                maze[ny][nx] = 0  # Mark passage
                stack.append((nx, ny))
                carved = True
                break

        if not carved:
            stack.pop()  # Backtrack

    return maze


def visualize_maze(maze, save_path="maze.png"):
    # Convert maze to a NumPy array
    maze_array = np.array(maze, dtype=np.uint8)

    # Map 0s to 255 (white) and 1s to 0 (black)
    maze_array = np.where(maze_array == 0, 255, 0).astype(np.uint8)

    # Save the image using OpenCV
    cv2.imwrite(save_path, maze_array)
    print(f"Maze saved as {save_path}")

    # Optionally, display the image
    cv2.imshow('Maze', maze_array)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


# Generate a 300x300 maze
large_maze = generate_large_maze(50, 50)
with open("maze.txt", "w") as f:
    f.write("[\n")
    for row in large_maze:
        f.write("  " + str(list(row)) + ",\n")
    f.write("]")

visualize_maze(large_maze)
