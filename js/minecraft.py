from ursina import *
from ursina.prefabs.first_person_controller import FirstPersonController
import random

app = Ursina()

# Window settings
window.fps_counter.enabled = True
window.exit_button.visible = False

# Basic textures (Using internal names to avoid path errors)
# Agar aapke paas images nahi hain, toh ye default white use karega
grass_texture = 'white_cube' 
stone_texture = 'white_cube'
brick_texture = 'white_cube'
dirt_texture  = 'white_cube'

current_texture = grass_texture

def update():
    global current_texture
    if held_keys['1']: current_texture = 'white_cube' # Grass replacement
    if held_keys['2']: current_texture = 'white_cube' # Stone replacement
    if held_keys['3']: current_texture = 'white_cube' # Brick replacement

# Voxel Class
class Voxel(Button):
    def __init__(self, position = (0,0,0), texture = 'white_cube'):
        super().__init__(
            parent = scene,
            position = position,
            model = 'cube',      # 'assets/block' ki jagah default 'cube' use kiya
            origin_y = 0.5,
            texture = texture,
            # FIXED: Yahan 'color.hsv' use kiya hai shade ke liye
            color = color.hsv(0, 0, random.uniform(0.9, 1)),
            scale = 0.5
        )

    def input(self, key):
        if self.hovered:
            if key == 'left mouse down':
                Voxel(position = self.position + mouse.normal, texture = current_texture)
            
            if key == 'right mouse down':
                destroy(self)

# Create Ground
for z in range(15):
    for x in range(15):
        voxel = Voxel(position = (x, 0, z))

# Player
player = FirstPersonController()

app.run()