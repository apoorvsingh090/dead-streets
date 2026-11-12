import bpy
import os

SRC = r"C:\Users\Apoorv\dead-streets\tools\male_city_zombie"
CLIPS = {
    "Walking.fbx": "walk",
    "Zombie Walk.fbx": "walk_alt",
    "Zombie Running.fbx": "run",
    "Zombie Attack.fbx": "attack",
    "Zombie Attack2.fbx": "attack2",
    "Zombie Attack3.fbx": "attack3",
    "Zombie Dying.fbx": "die",
    "Zombie Idle.fbx": "idle",
    "Zombie Idle2.fbx": "idle2",
    "Zombie Reaction Hit.fbx": "hit",
    "Zombie Scream.fbx": "scream",
}

main_arm = bpy.data.objects["Armature"]
main_arm.animation_data_clear()

for filename, clip in CLIPS.items():
    before_actions = set(bpy.data.actions)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, filename))
    imported = [o for o in bpy.context.selected_objects]
    arm_new = next(o for o in imported if o.type == "ARMATURE")
    action = next(a for a in bpy.data.actions if a not in before_actions)
    # remap Mixamo-style bone names to the CityDeadOutfit skeleton
    renamed = 0
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                drop = []
                for fc in bag.fcurves:
                    if fc.data_path in (
                        'pose.bones["root"].location',
                        'pose.bones["mixamorig:Hips"].location',
                    ):
                        drop.append(fc)
                        continue
                    new_path = fc.data_path.replace("mixamorig:", "CityDeadOutfit:")
                    if new_path != fc.data_path:
                        fc.data_path = new_path
                        renamed += 1
                for fc in drop:
                    bag.fcurves.remove(fc)
    action.name = clip
    # drop the imported armature object, keep the action
    bpy.data.objects.remove(arm_new, do_unlink=True)
    print(clip, "-> fcurves renamed:", renamed)

# remove the static base pose action imported with the mesh
for a in list(bpy.data.actions):
    if "BaseLayer" in a.name:
        bpy.data.actions.remove(a)

main_arm.animation_data_create()
for clip in CLIPS.values():
    action = bpy.data.actions[clip]
    track = main_arm.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(action.name, 1, action)

bpy.context.scene.frame_set(1)
print("actions:", sorted(a.name for a in bpy.data.actions))
print("tracks:", [t.name for t in main_arm.animation_data.nla_tracks])
