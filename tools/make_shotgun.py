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

ROOT = bpy.data.collections.new("shotgun")
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
WOOD = make_material("wood", (0.235, 0.115, 0.045), 0.82, 0.03)

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

# --- shotgun (Blender axes: +Y = muzzle direction, +Z = up) --------------------
# receiver
add_box("receiver", (0.11, 0.50, 0.13), (0, 0.05, 0.0), GUNMETAL, bevel=0.005)
add_box("top_rail", (0.14, 0.32, 0.06), (0, 0.12, 0.10), DARKMETAL, bevel=0.004)
# barrel over tube magazine
add_cylinder("barrel", 0.034, 0.034, 0.86, (0, 0.65, 0.055), DARKMETAL)
add_cylinder("tube_magazine", 0.025, 0.025, 0.72, (0, 0.59, -0.02), GUNMETAL)
# muzzle ring
add_cylinder("muzzle_ring", 0.040, 0.040, 0.05, (0, 1.09, 0.055), GUNMETAL)
# wooden pump
add_box("pump", (0.12, 0.27, 0.10), (0, 0.57, -0.01), WOOD, bevel=0.008)
for i in range(5):
    add_box(f"pump_groove_{i}", (0.124, 0.02, 0.055), (0, 0.46 + i * 0.05, -0.01), DARKMETAL, bevel=0.002)
# wooden stock
add_box("stock", (0.10, 0.44, 0.14), (0, -0.39, -0.035), WOOD,
        rot=(math.radians(-0.13), 0, 0), bevel=0.008)
add_box("buffer_tube", (0.08, 0.08, 0.20), (0, -0.15, -0.04), DARKMETAL, bevel=0.004)
# pistol grip
add_box("grip", (0.07, 0.09, 0.17), (-0.02, -0.12, -0.15), WOOD,
        rot=(math.radians(0.2), 0, 0), bevel=0.006)
# sights
add_box("rear_sight", (0.075, 0.08, 0.10), (0, 0.23, 0.15), DARKMETAL, bevel=0.003)
add_box("front_sight", (0.044, 0.035, 0.075), (0, 0.22, 0.185), DARKMETAL, bevel=0.002)
# bead front sight
add_cylinder("bead", 0.008, 0.008, 0.02, (0, 0.235, 0.23), GUNMETAL,
             rot=(0, 0, 0), vertices=10)
# ejection port detail
add_box("ejection_port", (0.012, 0.16, 0.05), (0.056, -0.02, 0.045), DARKMETAL, bevel=0.002)
add_box("barrel_ring_front", (0.085, 0.03, 0.09), (0, 1.02, 0.055), GUNMETAL, bevel=0.002)

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

print("shotgun built:", len(ROOT.objects), "parts")
