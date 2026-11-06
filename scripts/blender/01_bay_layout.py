"""Stage 01: metre-scale spatial greybox, not finished environment art.

Outputs stay in artifacts/fantasy-harbor/rebuild; never changes runtime assets.
"""
from pathlib import Path
import json
import math
import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/fantasy-harbor/rebuild"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene["Stage"] = "01 spatial greybox, not final art"
scene["Reference"] = "140m bay brief; 1.75m human scale; 12-person gathering"
scene["Limitations"] = "Layout prototype only: no final character, material, vegetation, rig or runtime integration"

collections = {}
for name in ["COL_Layout", "COL_Modular_Geo", "COL_SetDressing", "COL_Lights", "COL_Cameras", "COL_Collision", "COL_Ref"]:
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    collections[name] = col

def coord(p): return (p[0], -p[2], p[1])

def mat(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    return m

sand = mat("MAT_Greybox_Shore", (.58,.57,.51))
water = mat("MAT_Greybox_Water", (.18,.32,.36))
stone = mat("MAT_Greybox_Stone", (.4,.44,.45))
wall = mat("MAT_Greybox_Wall", (.74,.73,.68))
roof = mat("MAT_Greybox_Roof", (.25,.37,.37))
path_mat = mat("MAT_Greybox_Path", (.77,.74,.63))
wood = mat("MAT_Greybox_Timber", (.42,.35,.28))
human = mat("MAT_Scale_Reference", (.68,.4,.25))
plant = mat("MAT_Greybox_Tree", (.3,.4,.35))

def mesh(name, verts, faces, material, collection="COL_Layout"):
    data = bpy.data.meshes.new(name)
    data.from_pydata([coord(v) for v in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collections[collection].objects.link(obj)
    data.materials.append(material)
    return obj

def box(name, center, size, material, collection="COL_Modular_Geo"):
    x,y,z=center; w,h,d=[s/2 for s in size]
    return mesh(name,[(x-w,y-h,z-d),(x+w,y-h,z-d),(x+w,y+h,z-d),(x-w,y+h,z-d),
        (x-w,y-h,z+d),(x+w,y-h,z+d),(x+w,y+h,z+d),(x-w,y+h,z+d)],
        [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],material,collection)

def path(name, points, width=3):
    verts=[]
    for i,(x,z) in enumerate(points):
        a=Vector(points[max(0,i-1)]); b=Vector(points[min(len(points)-1,i+1)])
        t=(b-a).normalized(); n=Vector((-t.y,t.x))*width/2
        verts.extend([(x+n.x,.46,z+n.y),(x-n.x,.46,z-n.y)])
    return mesh(name,verts,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(len(points)-1)],path_mat)

# A concave, open bay: two headlands wrap a central inlet, with continuous land behind it.
outline=[(-70,25),(-75,0),(-68,-35),(-52,-65),(-20,-85),(20,-85),(52,-65),(68,-35),(75,0),(70,25),
    (48,30),(40,20),(31,9),(16,0),(0,-5),(-16,0),(-31,9),(-40,20),(-48,30)]
top=[Vector(coord((x,.44,z))) for x,z in outline]
lookup={tuple(v):i for i,v in enumerate(top)}
triangles=tessellate_polygon([top])
verts=[(x,.44,z) for x,z in outline]+[(x,-2.4,z) for x,z in outline]
n=len(outline)
def vertex_index(v): return v if isinstance(v,int) else lookup[tuple(v)]
faces=[tuple(vertex_index(v) for v in t) for t in triangles]
faces += [tuple(vertex_index(v)+n for v in reversed(t)) for t in triangles]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
terrain=mesh("SM_Layout_CrescentBay_150m",verts,faces,sand)
water_plane=box("SM_Layout_Sea",(0,-.2,-25),(260,.1,250),water)

routes={
    "arrival_to_courtyard": [(0,-5),(0,-11),(0,-19)],
    "courtyard_to_homes": [(0,-19),(8,-22),(16,-23)],
    "courtyard_to_grove": [(0,-19),(-14,-20),(-25,-25),(-35,-32)],
    "grove_to_lookout": [(-35,-32),(-44,-40),(-52,-52)],
    "homes_to_ruins": [(16,-23),(32,-23),(34,-38),(31,-60)],
    "rear_loop": [(-52,-52),(-32,-58),(-10,-60),(12,-63),(31,-60)],
    "west_promonade": [(-35,-32),(-40,-15),(-43,0),(-45,16)],
    "east_promonade": [(34,-38),(37,-19),(42,-3),(45,16)],
}
for name,points in routes.items(): path("SM_Path_"+name,points,3.2)

# The arrival pier is 21m long; the central courtyard holds 12 human-scale references.
for i in range(62): box("SM_Pier_Plank_%02d"%i,(0,.43,-5+i*.34),(3.4,.12,.315),wood)
for x in [-1.7,1.7]:
    for z in [-4,0,4,8,12,16]: box("SM_Pier_Pile",(x,.1,z),(.18,2.3,.18),wood)
for i in range(32):
    a=i/32*math.tau; b=(i+1)/32*math.tau
    mesh("SM_Courtyard_Sector",[(0,.465,-19),(math.cos(a)*9,.465,-19+math.sin(a)*9),
        (math.cos(b)*9,.465,-19+math.sin(b)*9)],[(0,2,1)],path_mat)

def house(name,x,z):
    floor=.44; w=6; d=5; height=3; ridge=4.2; thick=.22
    box(name+"_Floor",(x,floor-.05,z),(w,.1,d),wood)
    box(name+"_Back",(x,floor+height/2,z-d/2),(w,height,thick),wall)
    for side in [-1,1]: box(name+"_Side",(x+side*(w-thick)/2,floor+height/2,z),(thick,height,d),wall)
    # Actual open doorway: 1.2m clear width and 2.25m clear height.
    for side in [-1,1]: box(name+"_Jamb",(x+side*1.8,floor+height/2,z+d/2),(2.4,height,thick),wall)
    box(name+"_Lintel",(x,floor+2.625,z+d/2),(1.2,.75,thick),wall)
    # Front/back closed triangular gables meet both roof slopes exactly.
    for side in [-1,1]:
        zz=z+side*d/2
        vs=[(x-w/2,floor+height,zz-thick/2),(x+w/2,floor+height,zz-thick/2),(x,floor+ridge,zz-thick/2),
            (x-w/2,floor+height,zz+thick/2),(x+w/2,floor+height,zz+thick/2),(x,floor+ridge,zz+thick/2)]
        mesh(name+"_Gable",vs,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],wall,"COL_Modular_Geo")
    for side in [-1,1]:
        x0=x; x1=x+side*3.35; y0=floor+ridge; y1=floor+height-.14
        vs=[(x0,y0,z-2.85),(x1,y1,z-2.85),(x1,y1,z+2.85),(x0,y0,z+2.85),
            (x0,y0+.16,z-2.85),(x1,y1+.16,z-2.85),(x1,y1+.16,z+2.85),(x0,y0+.16,z+2.85)]
        mesh(name+"_Roof",vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],roof,"COL_Modular_Geo")

for i,(x,z) in enumerate([(16,-29),(26,-33),(16,-40),(-16,-29)]): house("SM_Greybox_Home_%d"%i,x,z)

def segment(name,a,b,radius,material,collection="COL_Ref"):
    av,bv=Vector(coord(a)),Vector(coord(b)); direction=bv-av
    axis=direction.normalized(); n=axis.cross(Vector((0,0,1)))
    if n.length<.001:n=axis.cross(Vector((1,0,0)))
    n.normalize();t=axis.cross(n);vs=[]
    for center in [av,bv]:
        for k in range(8):
            p=center+(n*math.cos(k*math.tau/8)+t*math.sin(k*math.tau/8))*radius
            vs.append((p.x,p.z,-p.y))
    faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(k,(k+1)%8,(k+1)%8+8,k+8) for k in range(8)]
    return mesh(name,vs,faces,material,collection)

def mannequin(index,x,z):
    y=.47
    # 7.5 head units; intentionally a scale mannequin, not a finished character.
    box("REF_Human_%02d_Torso"%index,(x,y+1.22,z),(.38,.48,.23),human,"COL_Ref")
    box("REF_Human_%02d_Hips"%index,(x,y+.92,z),(.3,.18,.23),human,"COL_Ref")
    segment("REF_Human_Neck",(x,y+1.46,z),(x,y+1.52,z),.045,human)
    segment("REF_Human_Head",(x,y+1.52,z),(x,y+1.75,z),.082,human)
    for side in [-1,1]:
        segment("REF_Human_Leg",(x+side*.09,y+.84,z),(x+side*.09,y+.08,z),.065,human)
        segment("REF_Human_Arm",(x+side*.24,y+1.42,z),(x+side*.3,y+.92,z),.045,human)
        box("REF_Human_Foot",(x+side*.09,y+.04,z+.04),(.12,.08,.25),human,"COL_Ref")

for i in range(12):
    a=i/12*math.tau
    mannequin(i,math.cos(a)*4.8,-19+math.sin(a)*4.8)
for x in [-6,6]:
    box("SM_Greybox_CommunityBench",(x,.95,-22.6),(3,.12,.7),wood)
    box("SM_Greybox_CommunityBack",(x,1.35,-22.95),(3,.7,.1),wood)
for i in range(12):
    if i == 3: continue  # Leave a real 3.6m entry gap in the stone circle.
    a=i/12*math.tau
    segment("SM_Greybox_RuinsPillar",(31+math.cos(a)*7,.44,-60+math.sin(a)*7),
        (31+math.cos(a)*7,4.5+(i%3)*.6,-60+math.sin(a)*7),.42,stone,"COL_SetDressing")
box("SM_Greybox_LookoutDeck",(-52,.53,-52),(11,.18,8),wood)
for i in range(14):
    a=i*2.4;x=-35+math.sin(a)*(5+i%3);z=-32+math.cos(a)*(6+i%3)
    segment("SM_Greybox_TreeTrunk",(x,.44,z),(x,5.5+i%3,z),.25,wood,"COL_SetDressing")
    box("SM_Greybox_CanopyVolume",(x,6+i%3,z),(3.8,2,3.8),plant,"COL_SetDressing")

scene.render.engine="BLENDER_WORKBENCH"
scene.display.shading.light="STUDIO"
scene.display.shading.color_type="MATERIAL"
scene.display.shading.show_cavity=True
scene.display.shading.show_shadows=True
scene.display.shading.background_type="WORLD"
if scene.world is None: scene.world=bpy.data.worlds.new("World_Layout_Review")
scene.world.color=(.32,.35,.38)
scene.view_settings.view_transform="Standard"
scene.render.resolution_x=1400
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
cam_data=bpy.data.cameras.new("CAM_Layout_Aerial")
cam=bpy.data.objects.new("CAM_Layout_Aerial",cam_data)
collections["COL_Cameras"].objects.link(cam)
scene.camera=cam
def set_camera(pos,target,ortho=None):
    cam.location=coord(pos)
    cam.rotation_euler=(Vector(coord(target))-cam.location).to_track_quat("-Z","Y").to_euler()
    cam_data.type="ORTHO" if ortho else "PERSP"
    cam_data.ortho_scale=ortho or 1
    cam_data.lens=30
    cam_data.clip_end=600

set_camera((110,125,155),(0,0,-25),190)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"01-bay-layout.blend"))
for name,pos,target,scale in [
    ("01-layout-aerial",(110,125,155),(0,0,-25),190),
    ("01-layout-arrival",(7,2.25,18),(0,2,-21),None),
    ("01-layout-courtyard",(0,2.2,-9),(15,2,-30),None),
]:
    set_camera(pos,target,scale)
    scene.render.filepath=str(OUT/(name+".png"))
    bpy.ops.render.render(write_still=True)
lengths={name:round(sum(math.dist(a,b) for a,b in zip(points,points[1:])),1) for name,points in routes.items()}
# Check main path centre lines against structural footprints; this is not an engine playtest.
footprints=[(16,-29),(26,-33),(16,-40),(-16,-29)]
path_wall_crossings=[]
for name,points in routes.items():
    for a,b in zip(points,points[1:]):
        steps=max(1,math.ceil(math.dist(a,b)/.25))
        for i in range(steps+1):
            x=a[0]+(b[0]-a[0])*i/steps;z=a[1]+(b[1]-a[1])*i/steps
            if any(abs(x-hx)<3 and abs(z-hz)<2.5 for hx,hz in footprints):
                path_wall_crossings.append({"path":name,"point":[round(x,2),round(z,2)]})
assert not path_wall_crossings, path_wall_crossings
mannequin_count=sum(1 for obj in bpy.data.objects if obj.name.startswith("REF_Human_") and obj.name.endswith("_Torso"))
assert mannequin_count == 12
report={"stage":"01-layout-greybox","not_finished_art":True,"units":"metres",
    "bounds_m":[150,115],"courtyard_diameter_m":18,"scale_mannequins":mannequin_count,"mannequin_height_m":1.75,
    "door_clearance_m":[1.2,2.25],"main_path_width_m":3.2,"arrival_pier_length_m":21,
    "route_lengths_m":lengths,"main_path_centerline_wall_crossings":path_wall_crossings,"source":"01-bay-layout.blend",
    "runtime_modified":False,"status":"AWAITING_LAYOUT_REVIEW; not approved for production"}
(OUT/"01-layout-metrics.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report),flush=True)
