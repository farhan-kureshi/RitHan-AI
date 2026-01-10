import pygame
import random
import asyncio

# Initialize Pygame
pygame.init()

# Game Constants (English words used for clarity)
SCREEN_WIDTH = 400
SCREEN_HEIGHT = 600
GRAVITY = 0.25
BIRD_JUMP = -6
PIPE_SPEED = 3
GAP_SIZE = 150

# Colors
WHITE = (255, 255, 255)
SKY_BLUE = (135, 206, 235)
BIRD_YELLOW = (255, 255, 0)
PIPE_GREEN = (0, 255, 0)

# Setup Screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Flappy Bird - Live Version")
clock = pygame.time.Clock()

async def main():
    # Game Variables
    bird_rect = pygame.Rect(50, SCREEN_HEIGHT // 2, 30, 30)
    bird_movement = 0
    
    pipes = []
    score = 0
    game_active = True
    
    # Timer for generating pipes
    SPAWNPIPE = pygame.USEREVENT
    pygame.time.set_timer(SPAWNPIPE, 1200)

    def create_pipe():
        random_pipe_pos = random.randint(150, 450)
        bottom_pipe = pygame.Rect(SCREEN_WIDTH, random_pipe_pos, 50, SCREEN_HEIGHT)
        top_pipe = pygame.Rect(SCREEN_WIDTH, random_pipe_pos - GAP_SIZE - SCREEN_HEIGHT, 50, SCREEN_HEIGHT)
        return bottom_pipe, top_pipe

    def move_pipes(pipes):
        for pipe in pipes:
            pipe.centerx -= PIPE_SPEED
        return [pipe for pipe in pipes if pipe.right > 0]

    def draw_pipes(pipes):
        for pipe in pipes:
            pygame.draw.rect(screen, PIPE_GREEN, pipe)

    def check_collision(pipes):
        for pipe in pipes:
            if bird_rect.colliderect(pipe):
                return False
        if bird_rect.top <= -100 or bird_rect.bottom >= SCREEN_HEIGHT:
            return False
        return True

    # Main Game Loop
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and game_active:
                    bird_movement = 0
                    bird_movement += BIRD_JUMP
                
                if event.key == pygame.K_SPACE and not game_active:
                    # Reset Game
                    game_active = True
                    pipes.clear()
                    bird_rect.center = (50, SCREEN_HEIGHT // 2)
                    bird_movement = 0
                    score = 0

            if event.type == SPAWNPIPE and game_active:
                pipes.extend(create_pipe())

        # Logic
        screen.fill(SKY_BLUE)

        if game_active:
            # Bird Physics
            bird_movement += GRAVITY
            bird_rect.centery += bird_movement
            pygame.draw.ellipse(screen, BIRD_YELLOW, bird_rect)

            # Pipes Logic
            pipes = move_pipes(pipes)
            draw_pipes(pipes)

            # Collision
            game_active = check_collision(pipes)
            
            # Score (Simplified: count pipes passed)
            score += 0.01 
        else:
            # Game Over Screen
            font = pygame.font.SysFont('Arial', 32)
            msg = font.render(f"Game Over! Score: {int(score)}", True, WHITE)
            restart_msg = font.render("Press SPACE to Restart", True, WHITE)
            screen.blit(msg, (SCREEN_WIDTH//2 - 100, SCREEN_HEIGHT//2 - 50))
            screen.blit(restart_msg, (SCREEN_WIDTH//2 - 130, SCREEN_HEIGHT//2))

        pygame.display.update()
        
        # Ye line browser support ke liye zaroori hai
        await asyncio.sleep(0)
        clock.tick(60)

# Run the game
asyncio.run(main())