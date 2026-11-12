import bpy
import math

# --- clear scene -------------------------------------------------------------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    bpy.data.collections.remove(collection)
for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for block in list(collection):
        if block.users == 0:
            collection.remove(block)

ROOT = bpy.data.collections.new("pistol")
bpy.context.scene.collection.children.link(ROOT)

# --- materials ----------------------------------------------------------------
def make_material(name, color, roughness, metallic):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

GUNMETAL = make_material("gunmetal", (0.175, 0.186, 0.191), 0.38, 0.85)
DARKMETAL = make_material("darkMetal", (0.065, 0.072, 0.078), 0.44, 0.78)
POLYMER = make_material("polymer", (0.095, 0.108, 0.102), 0.74, 0.05)
TAN = make_material("tanPolymer", (0.385, 0.268, 0.148), 0.8, 0.04)
TAPE = make_material("tape", (0.52, 0.385, 0.21), 0.95, 0.0)

# --- part helpers --------------------------------------------------------------
def add_box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 2
    obj.data.materials.append(mat)
    move_into_root(obj)
    return obj

def add_cylinder(name, r1, r2, length, loc, mat, rot=(math.radians(90), 0, 0), vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r1, depth=length, location=loc, rotation=rot, vertices=vertices
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    move_into_root(obj)
    return obj

def move_into_root(obj):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    ROOT.objects.link(obj)

def join_root(name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ROOT.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = ROOT.objects[0]
    bpy.ops.object.join()
    bpy.context.active_object.name = name
    return bpy.context.active_object

# --- M1911 sidearm (Blender axes: +Y = muzzle direction, +Z = up) --------------
# slide
add_box("slide", (0.095, 0.37, 0.10), (0, 0.16, 0.01), GUNMETAL, bevel=0.006)
add_box("slide_top", (0.084, 0.31, 0.035), (0, 0.18, 0.08), DARKMETAL, bevel=0.003)
# slide serrations (rear cocking cuts)
for i in range(4):
    add_box(f"serration_{i}", (0.098, 0.012, 0.05), (0, -0.005 - i * 0.022, 0.012), DARKMETAL, bevel=0.001)
# barrel tip
add_cylinder("barrel", 0.019, 0.019, 0.13, (0, 0.39, 0.015), DARKMETAL, vertices=14)
# frame below slide
add_box("frame", (0.078, 0.09, 0.15), (0, 0.01, -0.105), POLYMER, bevel=0.005)
# grip
add_box("grip", (0.072, 0.085, 0.20), (0, -0.015, -0.15), POLYMER,
        rot=(math.radians(-0.14), 0, 0), bevel=0.008)
add_box("grip_panel_l", (0.012, 0.06, 0.15), (0.038, -0.015, -0.15), TAPE,
        rot=(math.radians(-0.14), 0, 0), bevel=0.002)
add_box("grip_panel_r", (0.012, 0.06, 0.15), (-0.038, -0.015, -0.15), TAPE,
        rot=(math.radians(-0.14), 0, 0), bevel=0.002)
# beavertail + hammer
add_cylinder("hammer", 0.011, 0.011, 0.03, (0, -0.10, 0.055), DARKMETAL,
             rot=(math.radians(35), 0, 0), vertices=12)
# sights
add_box("rear_sight", (0.060, 0.072, 0.018), (0, 0.22, 0.112), DARKMETAL, bevel=0.002)
add_box("front_sight_l", (0.018, 0.025, 0.035), (0.029, 0.09, 0.112), DARKMETAL, bevel=0.002)
add_box("front_sight_r", (0.018, 0.025, 0.035), (-0.029, 0.09, 0.112), DARKMETAL, bevel=0.002)
# trigger guard + trigger
add_box("trigger_guard", (0.014, 0.11, 0.016), (0, 0.045, -0.115), GUNMETAL, bevel=0.003)
add_box("trigger", (0.012, 0.03, 0.05), (0, 0.055, -0.085), DARKMETAL,
        rot=(math.radians(18), 0, 0), bevel=0.004)
# tape wrap on the slide front
add_box("tape", (0.10, 0.14, 0.025), (0, 0.20, -0.015), TAPE, bevel=0.003)
# muzzle at Blender y = 0.46 (game muzzle z = -0.46)

# arms are added procedurally by the game, so the Blender asset stays weapon-only

# --- camera + light for preview render ------------------------------------------
bpy.ops.object.light_add(type="AREA", location=(1.4, 0.4, 1.6))
key = bpy.context.active_object
key.data.energy = 350
key.data.size = 1.5
move_into_root(key)
bpy.ops.object.camera_add(location=(1.7, -0.9, 1.15),
                          rotation=(math.radians(58), 0, math.radians(48)))
cam = bpy.context.active_object
move_into_root(cam)
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.render.film_transparent = False
world = scene.world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.02, 0.025, 0.03, 1.0)
bg.inputs[1].default_value = 1.0

print("pistol built:", len(ROOT.objects), "parts")
