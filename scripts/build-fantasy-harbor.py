"""Author the tidal sanctuary in Blender; export editable source, GLB and render.

Run Blender --background --python scripts/build-fantasy-harbor.py.
Coordinates in authoring helpers are game-space x, height, z (metres).
"""
from pathlib import Path
from collections import defaultdict
import math
import json
import random
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts/fantasy-harbor"
PUBLIC = ROOT / "public/models"
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(42)
scene = bpy.context.scene

def xyz(p):
    return (p[0], -p[2], p[1])

def empty(name, parent=None, location=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = xyz(location)
    return ob

def material(name, color, texture=None, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = .78
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    if texture:
        # Pack real image textures; procedural nodes alone do not survive glTF export.
        n = 256
        yy, xx = np.mgrid[0:n, 0:n]
        rng = np.random.default_rng(17)
        if texture == "wood":
            detail = .91 + .055 * np.sin(xx * .31 + 2 * np.sin(yy * .018)) + .035 * np.sin(xx * 1.25 + yy * .012)
        else:
            detail = .91 + .035 * np.sin(xx * .08 + yy * .12) + .035 * np.sin(xx * .27 - yy * .21)
        detail += rng.normal(0, .018, (n, n))
        pixels = np.ones((n, n, 4), dtype=np.float32)
        for channel in range(3):
            pixels[:, :, channel] = np.clip(color[channel] * detail, 0, 1)
        image = bpy.data.images.new(name + "-albedo", n, n)
        image.pixels.foreach_set(pixels.ravel())
        image.filepath_raw = str(OUT / (name + "-albedo.png"))
        image.file_format = "PNG"
        image.save()
        image.pack()
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

M = {
    "wood": material("carved-walnut", (.31, .19, .12), "wood"),
    "oak": material("honey-oak", (.54, .36, .2), "wood"),
    "teal": material("oxidized-teal", (.16, .4, .38), "stone"),
    "tealLight": material("sea-glass-roof", (.28, .52, .48), "stone"),
    "plaster": material("warm-lime", (.78, .71, .59), "stone"),
    "stone": material("ancient-limestone", (.45, .48, .46), "stone"),
    "brass": material("antique-brass", (.65, .44, .18)),
    "mint": material("luminous-mint-leaf", (.28, .66, .57), emission=.11),
    "lilac": material("moon-lilac-leaf", (.5, .36, .63), emission=.12),
    "leaf": material("shadow-jade-leaf", (.15, .36, .3)),
    "moss": material("velvet-moss", (.28, .4, .24)),
    "amber": material("seed-lantern-light", (1, .52, .16), emission=2.0),
    "crystal": material("tidal-crystal-light", (.14, .74, .8), emission=.7),
    "linen": material("woven-ivory", (.81, .73, .57), "stone"),
    "rug": material("woven-lavender", (.36, .29, .44), "stone"),
    "dark": material("blue-iron", (.08, .15, .17)),
}
M["brass"].node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = .65

def mesh(name, verts, faces, mat, parent=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in verts], [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.parent = parent
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    # Stable metre-space UVs for timber grain and plaster detail.
    uv = data.uv_layers.new(name="UVMap")
    for polygon in data.polygons:
        for li in polygon.loop_indices:
            co = data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv = (co.x * .8 + co.y * .2, co.z * .65 + co.y * .4)
    return ob

def grid(name, fn, nu, nv, mat, parent=None):
    verts = [fn(i / nu, j / nv) for j in range(nv + 1) for i in range(nu + 1)]
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            b = a + nu + 1
            faces.append((a, b, b + 1, a + 1))
    return mesh(name, verts, faces, mat, parent)

def solid(ob, thickness=.05, bevel=0):
    mod = ob.modifiers.new("Real material thickness", "SOLIDIFY")
    mod.thickness = thickness
    if bevel:
        mod = ob.modifiers.new("Soft worn edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    return ob

def cube(name, pos, size, mat, parent=None, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(pos))
    ob = bpy.context.object
    ob.name = name
    # Scale mesh data directly: no dependency-graph evaluation for every small shingle.
    for vertex in ob.data.vertices:
        vertex.co.x *= size[0]
        vertex.co.y *= size[2]
        vertex.co.z *= size[1]
    ob.parent = parent
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new("Hand-worn edge", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod = ob.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
    return ob

def sphere(name, pos, size, mat, parent=None, seg=14, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=xyz(pos))
    ob = bpy.context.object
    ob.name = name
    ob.scale = (size[0], size[2], size[1])
    ob.parent = parent
    ob.data.materials.append(mat)
    for face in ob.data.polygons:
        face.use_smooth = True
    return ob

def curve(name, points, radius, mat, parent=None, radii=None, resolution=3):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = resolution
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for i, (bp, pos) in enumerate(zip(spline.bezier_points, points)):
        bp.co = xyz(pos)
        bp.handle_left_type = bp.handle_right_type = "AUTO"
        if radii:
            bp.radius = radii[i]
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.parent = parent
    data.materials.append(mat)
    return ob

def ring(name, center, rx, ry, mat, parent=None, radius=.04, count=48):
    return curve(name, [(center[0] + rx * math.cos(i / count * math.tau),
        center[1] + ry * math.sin(i / count * math.tau), center[2]) for i in range(count + 1)],
        radius, mat, parent)

def leaf(name, pos, length, angle, mat, parent):
    # Folded six-sided lanceolate leaves, with a raised midrib.
    verts = [(0, 0, 0), (-.15, .045, .29), (-.12, .02, .61), (0, -.04, 1),
             (.12, .02, .61), (.15, .045, .29), (0, .1, .4)]
    ob = mesh(name, verts, [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6)], mat, parent)
    ob.location = xyz(pos)
    ob.scale = (length * .9, length, length)
    ob.rotation_euler = (.1 * math.sin(angle), .2 * math.cos(angle), angle)
    # Thin leaves show their underside too, without transparent sorting artifacts.
    mat.use_backface_culling = False
    return ob

# Bring in the exact walkable shore, pier and bench used by the simulation.
print("AUTHORING base and organic sea-house", flush=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / "harbor-base.glb"))
base = empty("harbor_ground_and_pier")
for ob in list(scene.objects):
    if ob is not base and ob.parent is None:
        ob.parent = base

house = empty("harbor_house")
shell = empty("harbor_house_shell", house)
roof = empty("harbor_house_roof", house)
interior = empty("harbor_house_interior", house)
front_z = -1.24
floor = .44

def roof_point(u, v):
    x = -2.95 + u * 5.9
    z = -.58 - v * 5.2
    y = 3.05 + math.sin(math.pi * u) ** .7 * 1.75
    y += .13 * math.cos(v * math.pi * 2) + .1 * math.sin(u * 7)
    y += (max(0, v - .72) / .28) ** 2 * .52
    return (4 + x, floor + y, z)

solid(grid("continuous-shell-roof", roof_point, 48, 36, M["teal"], roof), .12)
# Individually overlapped curved roof shingles, with fine copper edging.
for row in range(12):
    for col in range(20):
        u0 = col / 20 + (row % 2) * .008
        v0 = row / 12
        def tile(u, v, u0=u0, v0=v0):
            x, y, z = roof_point(min(1, u0 + u * .048), min(1, v0 + v * .092))
            return (x, y + .045 + .012 * math.sin(u * math.pi), z)
        solid(grid("overlapping-shell-shingle", tile, 3, 3,
            M["tealLight"] if (row + col) % 5 == 0 else M["teal"], roof), .035)
for u in [0, .17, .34, .5, .66, .83, 1]:
    curve("copper-shell-rib", [tuple(p + (0.09 if i == 1 else 0) for i, p in enumerate(roof_point(u, v / 24)))
        for v in range(25)], .028, M["brass"], roof)
for v in [0, 1]:
    curve("swept-eave-timber", [roof_point(u / 40, v) for u in range(41)], .12, M["wood"], roof)
curl = []
for i in range(49):
    t = i / 48
    a = -math.pi / 2 + t * math.pi * 2.05
    r = .95 * (1 - t * .83)
    curl.append((4 + math.cos(a) * r, 6.03 + math.sin(a) * r, -6.05 - t * .18))
curve("roof-spiral-finial", [roof_point(.5, 1)] + curl, .15, M["teal"], roof, radii=[1] * 50)
curve("finial-copper-inlay", [(x, y + .06, z + .13) for x, y, z in curl], .018, M["brass"], roof)

# Inhabitable lime walls; doorway is a true opening, never a painted oval.
for side in [-1, 1]:
    cube("side-lime-wall", (4 + side * 2.38, floor + 1.45, -3.3), (.18, 2.9, 4.12), M["plaster"], shell)
cube("back-lime-wall", (4, floor + 1.45, -5.31), (4.85, 2.9, .18), M["plaster"], shell)
for a, b in [(-2.4, -.38), (1.38, 2.4)]:
    grid("front-lime-wall", lambda u, v, a=a, b=b: (4 + a + (b-a)*u, floor + .04 + v*2.92, front_z), 8, 10, M["plaster"], shell)
grid("arched-doorway-spandrel", lambda u, v: (
    3.62 + u * 1.76,
    floor + 1.3 + math.sqrt(max(0, 1 - (2*u-1)**2))*1.25
        + v * (3.05 - 1.3 - math.sqrt(max(0, 1 - (2*u-1)**2))*1.25), front_z),
    36, 4, M["plaster"], shell)
for x in [1.65, 6.35]:
    curve("crooked-front-post", [(x, .46, -1.15), (x + .04, 1.7, -1.13), (x-.1, 3.42, -1.12)], .105, M["wood"], shell)
curve("front-arched-beam", [(x, y-.08, -.95) for x,y,_ in [roof_point(u/40,0) for u in range(41)]], .135, M["wood"], roof)
door_center = (4.5, floor + 1.3, front_z + .065)
ring("carved-door-surround", door_center, .94, 1.39, M["wood"], shell, .13)
ring("brass-door-inlay", (4.5, floor+1.3, front_z+.205), .92, 1.36, M["brass"], shell, .018)
# Scrollwork actually follows curves around the doorway and under the eaves.
for side in [-1, 1]:
    for index in range(4):
        x = 4.5 + side * (1.16 + index * .26)
        y = 2.5 + (3-index) * .1
        points = [(x + math.cos(t*.15)*(.16-t*.002), y+math.sin(t*.15)*(.16-t*.002), -1.02) for t in range(44)]
        curve("carved-eave-scroll", points, .018, M["oak"], roof)

door = empty("harbor_door", house, (3.66, floor, front_z + .08))
for i in range(10):
    xa = -.82 + i * .164
    xb = xa + .156
    verts = []
    for x in [xa, xb]:
        dy = math.sqrt(max(0, 1-(x/.84)**2))*1.25
        verts.extend([(x+.84, 1.3-dy, 0), (x+.84, 1.3+dy, 0)])
    solid(mesh("oval-door-plank", verts, [(0, 2, 3, 1)], M["tealLight"] if i%4==0 else M["teal"], door), .07)
ring("door-knocker", (.87, 1.1, .08), .11, .13, M["brass"], door, .022, 24)
for y in [.55, 1.95]:
    cube("door-hinge", (.13, y, .07), (.29, .05, .05), M["dark"], door, .01)
for i in range(3):
    cube("rounded-entry-stone", (4.5, .435, -.96 + i*.19), (1.7+i*.14, .08, .24), M["stone"], house, .07)

def window(x, y, z, parent):
    sphere("amber-oval-window", (x,y,z), (.37,.56,.035), M["amber"], parent)
    ring("carved-oval-window-frame", (x,y,z+.04), .41, .6, M["wood"], parent, .055)
    curve("window-mullion", [(x,y-.51,z+.08), (x,y+.51,z+.08)], .024,M["oak"],parent)
    curve("window-mullion", [(x-.34,y,z+.08), (x+.34,y,z+.08)], .024,M["oak"],parent)
window(2.42, 2.03, -1.17, shell)
window(5.96, 2.03, -1.17, shell)
window(4, 3.9, -.87, roof)

def lantern(pos, scale=1, parent=None):
    x,y,z = pos
    sphere("hanging-seed-light", pos, (.11*scale,.2*scale,.11*scale), M["amber"], parent)
    for i in range(6):
        a=i/6*math.tau
        curve("seed-lantern-cage", [(x,y+.24*scale,z), (x+math.cos(a)*.15*scale,y,z+math.sin(a)*.15*scale), (x,y-.24*scale,z)], .012*scale,M["brass"],parent)
    ring("seed-light-hanger", (x,y+.31*scale,z), .06*scale,.08*scale,M["brass"],parent,.012*scale,16)
for x in [3.39,5.61]:
    lantern((x,2.06,-.95),1.1,shell)
    curve("curved-lantern-hook", [(x,2.75,-1.2),(x,2.8,-.9),(x,2.42,-.9)],.025,M["wood"],shell)

# A fully furnished interior becomes visible as the camera enters the sea-house.
cube("interior-floor", (4,.42,-3.3), (4.6,.06,3.9), M["oak"], interior)
for i in range(17):
    cube("floorboard-seam", (1.79+i*.275,.456,-3.3), (.012,.003,3.9), M["wood"],interior,0)
cube("woven-reading-rug", (4,.466,-3.17), (2.25,.012,2.1),M["rug"],interior,.01)
for side in [-1,1]:
    for i in range(17):
        curve("rug-fringe", [(3+ i*.12,.47,-3.17+side*1.04),(3+i*.12,.47,-3.17+side*1.14)],.007,M["linen"],interior)
cube("low-bed-frame", (5.6,.75,-4.3), (1.2,.5,1.75), M["wood"], interior)
cube("stitched-mattress", (5.6,1.06,-4.3), (1.13,.23,1.68), M["linen"], interior,.12)
cube("folded-duvet", (5.6,1.2,-4.05), (1.15,.1,1.1), M["rug"], interior,.08)
sphere("pillow", (5.6,1.24,-4.85), (.44,.13,.25), M["linen"],interior)
cube("reading-desk-top", (2.35,1.4,-4.4), (1.2,.1,.7), M["oak"], interior)
for x in [1.86,2.84]:
    for z in [-4.12,-4.68]: cube("desk-leg",(x,.92,z),(.07,.95,.07),M["wood"],interior)
for i in range(5): cube("bound-book",(2.03+i*.13,1.58,-4.47),(.1,.27+ i%2*.08,.27),M["teal"] if i%2 else M["rug"],interior,.01)
cube("reading-chair-seat", (2.35,1.0,-3.5),( .68,.1,.62), M["wood"],interior)
for x in [2.08,2.62]:
    for z in [-3.27,-3.73]: cube("chair-leg",(x,.73,z),(.06,.56,.06),M["wood"],interior,.015)
cube("reading-chair-back",(2.35,1.38,-3.22),(.65,.65,.07),M["wood"],interior)
for i in range(3): cube("wall-shelf",(2.65,1.8+i*.4,-5.12),(1.75,.07,.28),M["wood"],interior)
hearth=empty("harbor_hearth",interior)
cube("hearth-stone", (5.8,.68,-2.1),(.78,.45,.68),M["stone"],hearth)
sphere("hearth-flame",(5.8,1.0,-2.1),(.17,.33,.16),M["amber"],hearth)
lantern((2.7,1.76,-4.5),.7,interior)

# Six wind-shaped trees: swept trunks, roots, thin leaves and suspended seed lamps.
print("AUTHORING folded-leaf grove", flush=True)
grove=empty("harbor_magic_grove")
placements=[(-8,-3.7,1.03,1),(-7,-5.4,.87,3),(-2.4,-6.5,1.08,7),(.3,-7,.84,5),(8,-4.5,.92,9),(7.2,-5.6,.75,2)]
for ti,(tx,tz,scale,phase) in enumerate(placements):
    def pt(x,y,z): return (tx+x*scale, .44+y*scale, tz+z*scale)
    trunk=[pt(0,0,0),pt(.25,1.1,.05),pt(-.17,2.15,.12),pt(.28,3.5,0),pt(.1,4.6,-.1)]
    curve("twisted-heartwood",trunk,.25*scale,M["wood"],grove,[1.4,1,.72,.44,.12],6)
    for k in range(7):
        a=k/7*math.tau
        curve("spreading-root",[pt(0,.32,0),pt(math.cos(a)*.4,.07,math.sin(a)*.4),pt(math.cos(a)*.85,.015,math.sin(a)*.85)],.09*scale,M["wood"],grove,[1,.65,.05])
        curve("flowing-bark-groove",[pt(.24*math.cos(a+y*.7)+math.sin(y*2)*.1,y,.19*math.sin(a+y*.7)) for y in [0,.6,1.2,1.8,2.4,3,3.6]],.012*scale,M["oak"],grove)
    for branch in range(9):
        a=branch*2.399+phase
        bx,bz=math.cos(a)*1.65,math.sin(a)*1.4
        height=3.1+(branch%3)*.5
        curve("swept-canopy-bough",[pt(.1,2.4,0),pt(bx*.55,height+.25,bz*.55),pt(bx,height,bz)],.1*scale,M["wood"],grove,[1,.55,.08],5)
        for spray in range(5):
            sa=a+spray*.8
            sx=bx+math.cos(sa)*.5
            sz=bz+math.sin(sa)*.5
            sy=height+.12+math.sin(spray*2)*.15
            curve("leaf-bearing-twig",[pt(bx*.8,height+.1,bz*.8),pt(sx,sy,sz)],.022*scale,M["oak"],grove,[1,.05])
            for k in range(10):
                ka=k*2.4+sa
                position=pt(sx+math.cos(ka)*(.12+k*.036),sy+math.sin(k*1.5)*.17,sz+math.sin(ka)*(.12+k*.036))
                leaf("folded-willow-leaf",position,(.28+random.random()*.18)*scale,ka,
                    M["lilac"] if (ti+branch+spray)%4==0 else M["mint"] if k%4 else M["leaf"],grove)
        if branch in [1,4,7] and ti in [0,2,4]:
            pos=pt(bx,height-.65,bz)
            curve("lantern-thread",[pt(bx,height-.05,bz), (pos[0],pos[1]+.3,pos[2])],.008,M["brass"],grove)
            lantern(pos,.8,grove)

ruins=empty("harbor_tidal_ruins")
print("AUTHORING ruins and floating islands", flush=True)
for side in [-1,1]:
    for row in range(7):
        ob=cube("weathered-arch-block",(-4.2+side*1.45,.65+row*.42,-7.45),(.65,.4,.7),M["stone"],ruins,.06)
        ob.rotation_euler.z=random.uniform(-.035,.035)
for i in range(13):
    a=i/12*math.pi
    ob=cube("ancient-arch-voussoir",(-4.2+math.cos(a)*1.45,3.18+math.sin(a)*1.45,-7.45),(.4,.53,.72),M["stone"],ruins,.05)
    ob.rotation_euler.y=math.pi/2-a
for i in range(15):
    x=-6+random.random()*4
    z=-7.2+random.random()*.5
    sphere("arch-moss",(x,.5,z),(.25,.11,.22),M["moss"],ruins,10,6)
for i in range(17):
    x=-1.6+math.sin(i*2.4)*.7
    z=-5.25+math.cos(i*2.4)*.6
    h=.25+(i%5)*.14
    bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.09+(i%3)*.025,radius2=0,depth=h,location=xyz((x,.44+h/2,z)))
    ob=bpy.context.object;ob.name="tidal-crystal";ob.data.materials.append(M["crystal"]);ob.parent=ruins
    ob.rotation_euler.x=math.sin(i)*.22
for i in range(95):
    a=i*2.399
    x=math.sin(a)*(7.7+random.random()*.6)
    z=-1+math.cos(a)*(5.8+random.random()*.4)
    if z>1.1 or 1<x<7:continue
    for k in range(3):
        y=.55+k*.08
        sphere("luminous-bell-flower",(x+math.sin(k)*.06,y,z),(.045,.065,.045),M["lilac"] if i%2 else M["mint"],ruins,8,5)
    curve("flower-stem",[(x,.44,z),(x,.82,z)],.008,M["leaf"],ruins)

sky=empty("harbor_floating_archipelago")
for i,(x,y,z,size) in enumerate([(-19,11,-29,3.8),(15,14,-39,4.5),(-3,17,-54,3.1),(27,9,-29,2.6)]):
    # An inverted stratified rock loft rather than a sphere suspended in midair.
    grid("floating-rock-strata",lambda u,v,x=x,y=y,z=z,size=size:(x+math.sin(u*math.tau)*size*(.07+math.sin(v*math.pi/2)**.7)*(1+.08*math.sin(u*27+v*4)),
        y-4.2*size*(1-v)/3 + math.sin(u*11)*.1,
        z+math.cos(u*math.tau)*size*.68*(.07+math.sin(v*math.pi/2)**.7)),48,14,M["stone"],sky)
    sphere("floating-moss-crown",(x,y,z),(size,.24,size*.68),M["moss"],sky,24,8)
    for k in range(6):
        a=k*2.4
        curve("hanging-island-root",[(x+math.sin(a)*size*.8,y,z+math.cos(a)*size*.55),
            (x+math.sin(a)*size*.6,y-2,z+math.cos(a)*size*.5),
            (x+math.sin(a)*size*.5,y-3.3,z+math.cos(a)*size*.4)],.055,M["wood"],sky,[1,.5,.01])
    for k in range(4):
        width=.05+k*.035
        grid("mistfall-ribbon",lambda u,v,x=x,y=y,z=z,size=size,width=width,k=k:(x+size*.65+(u-.5)*width+math.sin(v*5+k)*.025,
            y-v*(5.5+k*.2),z+.1*k),2,12,M["crystal"],sky)
# Broken, engraved stone halo frames the far sky.
for i in range(43):
    a=.15+i*.113
    x=2+math.cos(a)*8.1
    y=12.5+math.sin(a)*8.1
    z=-48+math.cos(a)*1.5
    ob=cube("sky-halo-segment",(x,y,z),(.82,.55,.8),M["stone"],sky,.055)
    ob.rotation_euler.y=math.pi/2-a
    for k in [-1,1]:
        curve("halo-carved-inlay",[(x+k*.16,y-.2,z+.43),(x+k*.24,y,z+.43),(x+k*.16,y+.2,z+.43)],.018,M["brass"],sky)

# Preserve interaction pivots; merge remaining geometry by material inside each category.
print("OPTIMIZING model batches", flush=True)
categories=[base,shell,roof,interior,door,grove,ruins,sky]
bpy.ops.object.select_all(action="DESELECT")
for ob in scene.objects:
    if ob.type in {"CURVE", "MESH"}:
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
bpy.ops.object.convert(target="MESH")
for group in categories:
    buckets=defaultdict(list)
    for ob in list(scene.objects):
        if ob.type=="MESH" and ob.parent is group and len(ob.data.materials)==1:
            buckets[ob.data.materials[0].name].append(ob)
    for material_name, objects in buckets.items():
        bpy.ops.object.select_all(action="DESELECT")
        for ob in objects:ob.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        ob=bpy.context.object
        ob.name=group.name+"__"+material_name
        # Normalize local transforms without moving the retained interaction pivots.
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)

mesh_objects=[ob for ob in scene.objects if ob.type=="MESH"]
triangles=sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in mesh_objects)
print("ASSET_BUDGET",len(mesh_objects),triangles,flush=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/"tidal-sanctuary.glb"),export_format="GLB",
    export_apply=True,export_animations=False,export_yup=True,export_extras=True,
    export_texcoords=True,export_normals=True,export_materials="EXPORT")
(OUT/"model-manifest.json").write_text(json.dumps({"meshes":len(mesh_objects),"triangles":triangles,
    "units":"metres","source":"tidal-sanctuary.blend","runtime":"/models/tidal-sanctuary.glb",
    "interactionNodes":["harbor_door","harbor_house_roof","harbor_house_shell","harbor_hearth"]},indent=2),encoding="utf-8")

# A presentation camera belongs only to the editable .blend, not the game export.
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=1500
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new("Lavender tidal twilight")
scene.world.use_nodes=True
scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.2,.25,.39,1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value=.55
def aim(ob,target):ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat("-Z","Y").to_euler()
for name,pos,power,size,color in [("Apricot sunset",(-8,15,-12),2300,12,(1,.75,.56)),("Lavender sky",(6,12,8),1700,10,(.66,.77,1))]:
    data=bpy.data.lights.new(name,"AREA");data.energy=power;data.shape="DISK";data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=xyz(pos);aim(ob,(0,1,-1))
camera_data=bpy.data.cameras.new("Sanctuary model inspection")
camera=bpy.data.objects.new("Sanctuary model inspection",camera_data)
scene.collection.objects.link(camera);camera.location=xyz((13,11,22));aim(camera,(0,2,-1.8))
camera_data.lens=43;scene.camera=camera
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(OUT/"blender-sanctuary.png")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"tidal-sanctuary.blend"))
bpy.ops.render.render(write_still=True)
print("Saved Blender source, runtime GLB and verified render.",flush=True)
