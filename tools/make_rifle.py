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

ROOT = bpy.data.collections.new("rifle")
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

# --- rifle (Blender axes: +Y = muzzle direction, +Z = up) ----------------------
# receiver block
add_box("receiver", (0.11, 0.46, 0.13), (0, 0.11, 0.0), GUNMETAL, bevel=0.005)
# upper receiver / carry handle base
add_box("upper", (0.10, 0.55, 0.06), (0, 0.19, 0.095), DARKMETAL, bevel=0.004)
# handguard
add_box("handguard", (0.09, 0.36, 0.10), (0, 0.48, 0.015), POLYMER, bevel=0.008)
for i in range(4):
    add_box(f"rail_{i}", (0.096, 0.05, 0.012), (0, 0.36 + i * 0.075, 0.062), DARKMETAL, bevel=0.002)
# barrel
add_cylinder("barrel", 0.024, 0.024, 0.50, (0, 0.72, 0.04), DARKMETAL)
# muzzle brake
add_cylinder("muzzle_brake", 0.037, 0.037, 0.07, (0, 0.95, 0.04), GUNMETAL)
add_box("flash_hider", (0.075, 0.18, 0.06), (0, 0.97, 0.06), DARKMETAL, bevel=0.003)
# stock
add_box("stock", (0.10, 0.33, 0.13), (0, -0.27, -0.02), POLYMER,
        rot=(math.radians(-0.08), 0, 0), bevel=0.006)
add_box("buffer_tube", (0.08, 0.08, 0.13), (0, -0.15, -0.02), DARKMETAL, bevel=0.004)
# pistol grip
add_box("grip", (0.07, 0.08, 0.17), (-0.01, -0.02, -0.14), POLYMER,
        rot=(math.radians(0.22), 0, 0), bevel=0.006)
# magazine
add_box("magazine", (0.075, 0.12, 0.25), (0, 0.16, -0.16), DARKMETAL,
        rot=(math.radians(-0.13), 0, 0), bevel=0.005)
# sights
add_box("sight_base", (0.055, 0.20, 0.028), (0, 0.25, 0.145), DARKMETAL, bevel=0.002)
add_box("rear_sight", (0.032, 0.035, 0.07), (0, 0.17, 0.19), DARKMETAL, bevel=0.002)
add_box("front_sight", (0.05, 0.035, 0.08), (0, 0.35, 0.18), DARKMETAL, bevel=0.002)
# tape wrap on handguard
add_box("tape", (0.12, 0.18, 0.035), (0, 0.36, 0.02), TAPE, bevel=0.003)
# ejection port + charging handle detail
add_box("ejection_port", (0.012, 0.14, 0.05), (0.056, 0.05, 0.045), DARKMETAL, bevel=0.002)
add_box("charging_handle", (0.05, 0.06, 0.02), (0, 0.345, 0.125), DARKMETAL, bevel=0.002)
add_cylinder("selector", 0.016, 0.016, 0.014, (0.056, 0.10, 0.02), GUNMETAL,
             rot=(0, math.radians(90), 0), vertices=12)

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

print("rifle built:", len(ROOT.objects), "parts")
