import bpy
from pathlib import Path

# Run with Blender --background --python assets/source/characters/cozy-avatar/export.py.
# Re-run geometry and animation QA after editing the source, before shipping it.
source = Path(__file__).resolve().parent
repo = source.parents[3]
bpy.ops.wm.open_mainfile(filepath=str(source / 'cozy-avatar.blend'), load_ui=False, use_scripts=False)
rig = bpy.data.objects['CozyAvatar_Rig']
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.rotation_euler = (0, 0, 0)
    bone.location = (0, 0, 0)
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in {'MESH', 'ARMATURE'})
bpy.context.view_layer.objects.active = rig
bpy.context.scene.render.fps = 30
bpy.ops.export_scene.gltf(
    filepath=str(repo / 'public/assets/models/avatars/cozy-avatar-v1.glb'),
    export_format='GLB', use_selection=True, export_yup=True,
    export_animations=True, export_animation_mode='ACTIONS',
    export_skins=True, export_all_influences=False, export_materials='EXPORT',
    export_image_format='AUTO', export_force_sampling=True,
)
