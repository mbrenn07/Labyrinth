import numpy as np
import random


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


# Generate a 300x300 maze
large_maze = generate_large_maze(300, 300)
with open("maze.txt", "w") as f:
    f.write("[\n")
    for row in large_maze:
        f.write("  " + str(list(row)) + ",\n")
    f.write("]")
