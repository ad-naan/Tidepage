"""Shared data-API geometry and PBR helpers. Coordinates use Blender Z-up metres."""
from pathlib import Path
import math, random, json
import bpy, bmesh
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/fantasy-harbor/rebuild'
ASSETS = OUT / 'assets'
EXPORT = OUT / 'exports'
EXPORT.mkdir(exist_ok=True)
RNG = random.Random(5271)

def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC'
    bpy.context.scene.unit_settings.scale_length=1

def collection(name):
    c=bpy.data.collections.get(name)
    if not c:
        c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c

def material(name, color, rough=.65, metal=0, texture=None):
    m=bpy.data.materials.new(name);m.use_nodes=True
    m.diffuse_color=(*color,1)
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal
    if texture:
        size=512; y,x=np.mgrid[:size,:size]; rg=np.random.default_rng(172)
        n=rg.random((size,size))-.5
        if texture=='wood':v=1+.13*np.sin(x*.13+3*np.sin(y*.016))+.035*n
        elif texture=='fabric':v=1+.035*np.sin(x*math.pi/2)*np.sin(y*math.pi/2)+n*.035
        else:v=1+.018*np.sin(x*.059+np.sin(y*.043)*2)+n*.035
        pixels=np.ones((size,size,4),dtype=np.float32)
        for k in range(3):
            linear=np.clip(color[k]*v,0,1)
            pixels[:,:,k]=np.where(linear<.0031308,12.92*linear,1.055*linear**(1/2.4)-.055)
        im=bpy.data.images.new(name+'_BaseColor',width=size,height=size)
        im.colorspace_settings.name='sRGB';im.pixels.foreach_set(pixels.ravel());im.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im
        m.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
    return m

def mesh(name,vs,fs,mat,col='COL_Assets',uvs=None,smooth=False):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update()
    ob=bpy.data.objects.new(name,me);collection(col).objects.link(ob)
    if mat:me.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0000001)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.0000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    uv=me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        p.use_smooth=smooth
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]],v[axes[1]])
    if uvs:
        for i,co in enumerate(uvs):uv.data[i].uv=co
    return ob

def box(name,center,size,mat,col='COL_Assets',bevel=0):
    x,y,z=center;a,b,c=[v/2 for v in size]
    vs=[(x+sx*a,y+sy*b,z+sz*c) for sx,sy,sz in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    ob=mesh(name,vs,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat,col)
    if bevel:
        mod=ob.modifiers.new('Authored edge bevel','BEVEL');mod.width=min(bevel,min(size)*.20);mod.segments=2
    return ob

def sweep(name,points,radii,mat,sides=8,col='COL_Assets'):
    points=[Vector(p) for p in points];vs=[]
    if len(points)>2:
        dense=[];rr=[];original=points
        rs=radii if isinstance(radii,list) else [radii]*len(points)
        for j in range(len(original)-1):
            a=original[max(0,j-1)];b=original[j];c=original[j+1];d=original[min(j+2,len(original)-1)]
            for k in range(4):
                t=k/4;dense.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t));rr.append(rs[j]*(1-t)+rs[j+1]*t)
        points=dense+[original[-1]];radii=rr+[rs[-1]]
    previous_normal=None
    for j,p in enumerate(points):
        tangent=(points[min(j+1,len(points)-1)]-points[max(j-1,0)]).normalized()
        n=previous_normal-tangent*previous_normal.dot(tangent) if previous_normal is not None else tangent.cross(Vector((0,0,1)))
        if n.length<.01:n=tangent.cross(Vector((0,1,0)))
        n.normalize();t=tangent.cross(n).normalized();r=radii[j] if isinstance(radii,list) else radii
        previous_normal=n
        for i in range(sides):
            a=i*math.tau/sides;vs.append(tuple(p+r*(math.cos(a)*n+math.sin(a)*t)))
    fs=[tuple(reversed(range(sides))),tuple((len(points)-1)*sides+i for i in range(sides))]
    for j in range(len(points)-1):
        for i in range(sides):fs.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    return mesh(name,vs,fs,mat,col,smooth=True)

def sphere(name,center,scale,mat,segments=24,rings=12,col='COL_Assets'):
    # Welded poles, no collapsed pole quads.
    vs=[(center[0],center[1],center[2]+scale[2])]
    for j in range(1,rings):
        p=j*math.pi/rings
        for i in range(segments):
            a=i*math.tau/segments
            vs.append((center[0]+scale[0]*math.sin(p)*math.cos(a),center[1]+scale[1]*math.sin(p)*math.sin(a),center[2]+scale[2]*math.cos(p)))
    vs.append((center[0],center[1],center[2]-scale[2]));bottom=len(vs)-1
    fs=[(0,1+i,1+(i+1)%segments) for i in range(segments)]
    for j in range(rings-2):
        for i in range(segments):
            a=1+j*segments+i;b=1+j*segments+(i+1)%segments
            fs.append((a,a+segments,b+segments,b))
    fs.extend((bottom,1+(rings-2)*segments+(i+1)%segments,1+(rings-2)*segments+i) for i in range(segments))
    return mesh(name,vs,fs,mat,col,smooth=True)

def evaluated_copy(ob):
    dep=bpy.context.evaluated_depsgraph_get()
    return bpy.data.meshes.new_from_object(ob.evaluated_get(dep),depsgraph=dep)

def apply_modifiers(ob):
    if not ob.modifiers:return
    old=ob.data;ob.data=evaluated_copy(ob);ob.modifiers.clear()
    if old.users==0:bpy.data.meshes.remove(old)

def merge_materials(objects,prefix):
    bpy.context.view_layer.update()
    dep=bpy.context.evaluated_depsgraph_get()
    copies=[(ob,bpy.data.meshes.new_from_object(ob.evaluated_get(dep),depsgraph=dep)) for ob in objects if ob.type=='MESH' and ob.modifiers]
    for ob,data in copies:ob.data=data;ob.modifiers.clear()
    groups={}
    for ob in objects:
        if ob.type!='MESH':continue
        mat=ob.data.materials[0] if len(ob.data.materials) else None
        groups.setdefault(mat,[]).append(ob)
    result=[]
    for mat,obs in groups.items():
        vs=[];fs=[];uvs=[];flags=[]
        for ob in obs:
            start=len(vs);vs.extend(tuple(ob.matrix_world@v.co) for v in ob.data.vertices)
            for p in ob.data.polygons:
                fs.append(tuple(start+i for i in p.vertices));flags.append(p.use_smooth)
                uvs.extend(tuple(ob.data.uv_layers.active.data[i].uv) for i in p.loop_indices)
        merged=mesh(prefix+'_'+(mat.name if mat else 'neutral'),vs,fs,mat,uvs=uvs)
        for p,flag in zip(merged.data.polygons,flags):p.use_smooth=flag
        for ob in obs:bpy.data.objects.remove(ob,do_unlink=True)
        result.append(merged)
    return result

def camera(name,pos,target,lens=55):
    data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);collection('COL_Review').objects.link(ob)
    ob.location=pos;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;data.clip_end=600
    return ob

def lighting(studio=False):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.threads_mode='FIXED';scene.render.threads=8
    scene.world=bpy.data.worlds.new('World_WarmSky');scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.49,.65,.8,1);bg.inputs[1].default_value=.65
    def light(name,pos,power,size):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);collection('COL_Review').objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    if studio:light('LGT_Key',(-3,-4,5),400,4);light('LGT_Rim',(2,2,4),450,3);light('LGT_Fill',(3,-2,2),150,3)
    else:
        d=bpy.data.lights.new('LGT_Sun','SUN');d.energy=3.0;d.angle=.09;d.color=(1,.83,.64)
        o=bpy.data.objects.new('LGT_Sun',d);collection('COL_Review').objects.link(o);o.rotation_euler=(.55,-.6,-.5)
        scene.view_settings.exposure=.65
    scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    scene.render.resolution_percentage=100

def render(cam,path,width=1000,height=1000):
    s=bpy.context.scene;s.camera=cam;s.render.filepath=str(path);s.render.resolution_x=width;s.render.resolution_y=height
    bpy.ops.render.render(write_still=True)

def metrics(objects):
    tris=0
    for o in objects:
        if o.type=='MESH':
            o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    return {'meshes':sum(o.type=='MESH' for o in objects),'triangles':tris,'materials':len({m.name for o in objects if o.type=='MESH' for m in o.data.materials})}

def save(path):
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(path))

def export(path,objects):
    for o in bpy.context.selected_objects:o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=False,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
