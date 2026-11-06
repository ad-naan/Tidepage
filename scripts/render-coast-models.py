"""Import the authored GLBs, keep editable meshes, and render a Blender model sheet.

Run: blender --background --python scripts/render-coast-models.py
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
output = root / "artifacts" / "coast-models"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1500
scene.render.resolution_y = 950
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.world = bpy.data.worlds.new("Coastal studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.64, 0.67, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.35

for index, name in enumerate(["sea-traveler", "coral-traveler", "oat-traveler"]):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(output / (name + ".glb")))
    imported = set(bpy.data.objects) - before
    # glTF import converts the Y-up runtime asset to Blender's Z-up coordinates.
    for obj in imported:
        if obj.parent is None:
            obj.location.x += (index - 1) * 1.8
            obj.rotation_euler.z = math.radians(8 if index == 0 else -8 if index == 2 else 0)
            obj.name = name
        if obj.animation_data:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = True
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = True

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    return mat

bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
floor.name = "Studio floor"
floor.data.materials.append(material("Sea mist studio", (0.61, 0.7, 0.68)))

def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

for name, location, energy, size, color in [
    ("Large softbox", (-3, -4, 6), 550, 5, (1, 0.87, 0.73)),
    ("Sky fill", (4, -1, 4), 350, 4, (0.75, 0.87, 1)),
    ("Warm rim", (1, 3, 5), 650, 3, (1, 0.77, 0.58)),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = location
    aim(light, (0, 0, 1))

camera_data = bpy.data.cameras.new("Character sheet camera")
camera = bpy.data.objects.new("Character sheet camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -9, 3.25)
aim(camera, (0, 0, 1.15))
camera_data.type = "ORTHO"
camera_data.ortho_scale = 6.1
scene.camera = camera
scene.frame_set(1)
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(output / "coastal-travelers.png")
bpy.ops.wm.save_as_mainfile(filepath=str(output / "coastal-travelers.blend"))
bpy.ops.render.render(write_still=True)
print("Saved editable Blender source and model sheet to", output)
