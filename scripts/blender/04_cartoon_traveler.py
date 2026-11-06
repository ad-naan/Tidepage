"""User-directed cartoon revision. Transform the authored, weighted traveler,
including eye-loop topology and bones, into a consistent small cartoon silhouette.
This is a new source checkpoint; the adult study is retained for provenance.
"""
import sys,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from harbor_common import *
bpy.ops.wm.open_mainfile(filepath=str(OUT/'02-traveler.blend'))
arm=bpy.data.objects['ARM_Traveler']
def shape(p):
    p=Vector(p);original=p.copy()
    if p.z>1.54 and p.y<-.07:
        c=Vector((.0323 if p.x>0 else -.0323,-.132,1.624))
        dx=p.x-c.x;dz=p.z-c.z
        middle=max(0,min(1,abs(p.x)/.023));middle=middle*middle*(3-2*middle)
        w=math.exp(-((dx/.031)**4+(dz/.029)**4))*max(0,min(1,(-p.y-.07)/.045))*middle
        p.x+=dx*w*.55;p.z+=dz*w*.80
        # Soft cheeks and a smaller nose bridge, retaining all original eyelid/lip loops.
        cheek=math.exp(-(((abs(p.x)-.048)/.03)**2+((p.z-1.589)/.031)**2))
        p.x+=math.copysign(.008*cheek,p.x);p.y-=.004*cheek
        p.y+=.009*math.exp(-((p.x/.016)**4+((p.z-1.59)/.025)**4))
        smile=math.exp(-((p.x/.038)**6+((p.z-1.548)/.012)**4))
        p.z+=.009*(abs(p.x)/.03)**1.4*smile
    blend=max(0,min(1,(original.z-1.43)/.10));blend=blend*blend*(3-2*blend)
    body=p*.70
    head=Vector((p.x*1.65,p.y*1.45,1.45*.70+(p.z-1.45)*1.45-.055))
    return body.lerp(head,blend)

objects=[o for o in bpy.data.collections['COL_Traveler'].objects if o.type=='MESH']
for ob in objects:
    for v in ob.data.vertices:v.co=shape(v.co)
    ob.data.update()
    # The cartoon uses warm, quiet skin and a matte cloth finish.
    if 'HairScalp' in ob.name:
        for v in ob.data.vertices:
            d=v.co-Vector((0,.01,1.28))
            if d.length:v.co+=d.normalized()*.009
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for b in arm.data.edit_bones:
    b.head=shape(b.head);b.tail=shape(b.tail)
bpy.ops.object.mode_set(mode='OBJECT');arm.select_set(False)

# Replace all fitted-skin garment studies with a clean cartoon tailoring pattern.
remove_tokens=['TailoredJacket','IvoryVest','FoldedLapel','LapelPiping','PocketWelt','JacketButton','RolledKnitCuff','RibbedCollar']
for ob in list(objects):
    if any(t in ob.name for t in remove_tokens):objects.remove(ob);bpy.data.objects.remove(ob,do_unlink=True)
coat=bpy.data.materials['traveler-coat'];knit=bpy.data.materials['traveler-knit'];leather=bpy.data.materials['traveler-leather'];brass=bpy.data.materials['traveler-brass']
before=set(bpy.data.objects)
def tailored(name,profile,mat,opening=.0,n=40):
    vs=[];fs=[]
    for z,rx,ry in profile:
        gap=opening*(.65+.5*max(0,(z-.7)/.3))
        for i in range(n+1):
            a=gap+(math.tau-2*gap)*i/n
            fold=.0017*math.sin(a*7+z*24)*math.sin(z*51)
            vs.append(((rx+fold)*math.sin(a),-(ry+fold)*math.cos(a),z))
    for j in range(len(profile)-1):
        for i in range(n):fs.append((j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i))
    ob=mesh(name,vs,fs,mat,'COL_Traveler',smooth=True)
    sol=ob.modifiers.new('Tailoring seam thickness','SOLIDIFY');sol.thickness=.004;sol.offset=-1
    sub=ob.modifiers.new('Soft tailored silhouette','SUBSURF');sub.levels=1
    apply_modifiers(ob);return ob
profile=[(.66,.145,.093),(.675,.151,.098),(.71,.149,.099),(.78,.138,.093),(.85,.137,.098),(.92,.15,.104),(.975,.171,.095),(1.005,.116,.073),(1.025,.073,.057)]
tailored('SM_Cartoon_CleanTailoredCoat',profile,coat,.24)
tailored('SM_Cartoon_CableKnitVest',[(z,rx*.95,ry*.93) for z,rx,ry in profile if z>.69]+[(1.04,.069,.052)],knit,.0)
for side in [-1,1]:
    # Broad connected sleeves use curved center-lines and fabric cross-sections.
    tag='l' if side>0 else 'r'
    upper=arm.data.bones['upper_arm.'+tag];fore=arm.data.bones['forearm.'+tag]
    centers=[upper.head_local+Vector((0,0,.005)),upper.head_local.lerp(upper.tail_local,.4),upper.tail_local,fore.head_local.lerp(fore.tail_local,.52),fore.head_local.lerp(fore.tail_local,.88)]
    sleeve=sweep('SM_Cartoon_TailoredSleeve',centers,[.060,.059,.052,.046,.042],coat,20,'COL_Traveler')
    cuff=sweep('SM_Cartoon_RibbedSleeveCuff',[centers[-1]+Vector((0,0,.006)),centers[-1]+Vector((0,0,-.026))],[.043,.042],knit,20,'COL_Traveler')
    # Pockets follow the torso and have solid folded borders.
    pocket=box('SM_Cartoon_StitchedPocket',(side*.105,-.091,.755),(.065,.014,.070),coat,'COL_Traveler',.008)
    sweep('SM_Cartoon_PocketSeam',[(side*.075,-.101,.786),(side*.135,-.091,.786)],.0014,knit,5,'COL_Traveler')
    edge=[]
    for z,rx,ry in profile:
        a=.24*(.65+.5*max(0,(z-.7)/.3));edge.append((side*rx*math.sin(a),-ry*math.cos(a)-.002,z))
    sweep('SM_Cartoon_HandStitchedFrontSeam',edge,.0015,knit,5,'COL_Traveler')
for z in [.735,.825,.915]:sphere('SM_Cartoon_EngravedButton',(.047,-.105,z),(.010,.004,.010),brass,16,8,'COL_Traveler')
# A folded upright collar meets the neck, with real inner/outer rims.
tailored('SM_Cartoon_StandingCollar',[(1.015,.078,.060),(1.05,.081,.062),(1.057,.078,.059)],coat,.47)
for j in range(9):
    a=j*math.tau/9
    sweep('SM_Cartoon_KnitNeckRib',[(.069*math.sin(a),-.052*math.cos(a),1.025),(.069*math.sin(a),-.052*math.cos(a),1.048)],.0015,knit,5,'COL_Traveler')
new=[o for o in set(bpy.data.objects)-before if o.type=='MESH']
for ob in new:
    apply_modifiers(ob)
    candidates=[b for b in arm.data.bones if ('arm' in b.name or 'hand' in b.name)] if 'Sleeve' in ob.name else [arm.data.bones['chest']]
    vg={b.name:ob.vertex_groups.new(name=b.name) for b in candidates}
    for v in ob.data.vertices:
        distances=[]
        for b in candidates:
            a=b.head_local;d=b.tail_local-a;t=max(0,min(1,(v.co-a).dot(d)/d.length_squared));dist=(v.co-a-d*t).length
            distances.append((dist,b.name))
        near=sorted(distances)[:2];weights=[1/(d+.01)**5 for d,_ in near];total=sum(weights)
        for (_,name),w in zip(near,weights):vg[name].add([v.index],w/total,'REPLACE')
    mod=ob.modifiers.new('Cartoon clothing weights','ARMATURE');mod.object=arm;ob.parent=arm
objects+=new

# Remove covered shoulder skin, so collar and sleeves have no skin poke-through.
body=bpy.data.objects['SM_Traveler_ConnectedSkin']
bm=bmesh.new();bm.from_mesh(body.data)
remove=[f for f in bm.faces if sum(v.co.z for v in f.verts)/len(f.verts)<1.055 and abs(sum(v.co.x for v in f.verts)/len(f.verts))<.16]
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free()

# Fuse overlapping sculpted locks into one clean hair surface; retain organic lock relief.
hair_objects=[o for o in objects if any(t in o.name for t in ['HairScalp','SweptHairLock','HairStrand'])]
for o in bpy.context.selected_objects:o.select_set(False)
for o in hair_objects:o.select_set(True)
bpy.context.view_layer.objects.active=hair_objects[0];bpy.ops.object.join()
hair_ob=bpy.context.object;hair_ob.name='SM_Cartoon_SculptedHair'
hair_ob.modifiers.clear()
mod=hair_ob.modifiers.new('Joined sculpted locks','REMESH');mod.mode='VOXEL';mod.voxel_size=.0028;mod.use_smooth_shade=True
apply_modifiers(hair_ob)
mod=hair_ob.modifiers.new('Soft lock edges','SMOOTH');mod.factor=.7;mod.iterations=3;apply_modifiers(hair_ob)
mod=hair_ob.modifiers.new('Game hair topology','DECIMATE');mod.ratio=.28;apply_modifiers(hair_ob)
hair_ob.vertex_groups.clear();vg=hair_ob.vertex_groups.new(name='head');vg.add(list(range(len(hair_ob.data.vertices))),1,'REPLACE')
mod=hair_ob.modifiers.new('Head weights','ARMATURE');mod.object=arm;hair_ob.parent=arm
for m in list(hair_ob.data.materials)[1:]:pass
hair_ob.data.materials.clear();hair_ob.data.materials.append(bpy.data.materials['traveler-hair'])

objects=[o for o in bpy.data.collections['COL_Traveler'].objects if o.type=='MESH']
# Laces touch the shoe surface; UVs are deliberately tileable material coordinates.
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
boots=[o for o in objects if 'CraftedAnkleBoot' in o.name]
for ob in objects:
    if 'BootLace' in ob.name:
        c=sum((v.co for v in ob.data.vertices),Vector())/len(ob.data.vertices)
        boot=min(boots,key=lambda o:abs(sum(v.co.x for v in o.data.vertices)/len(o.data.vertices)-c.x))
        tree=BVHTree.FromObject(boot,bpy.context.evaluated_depsgraph_get())
        hit,normal,index,dist=tree.ray_cast(Vector((c.x,-1,c.z)),Vector((0,1,0)))
        if hit:
            for v in ob.data.vertices:v.co.y+=hit.y-.001-c.y
    bm=bmesh.new();bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4])
    bm.to_mesh(ob.data);bm.free();ob.data.update()
    if not ob.data.uv_layers:ob.data.uv_layers.new(name='UVMap')
    uv=ob.data.uv_layers.active
    for p in ob.data.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            v=ob.data.vertices[ob.data.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]]*4,v[axes[1]]*4)
for m in bpy.data.materials:
    if 'hair' in m.name:
        bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.64

# Remove the study's cameras, retain its studio lights.
for ob in list(bpy.data.objects):
    if ob.type=='CAMERA':bpy.data.objects.remove(ob,do_unlink=True)
cams=[camera('CAM_Cartoon_Front',(1.5,-3.3,1.15),(0,0,.77),65),camera('CAM_Cartoon_Profile',(3.3,-.35,1.15),(0,0,.77),65),camera('CAM_Cartoon_Back',(1.4,3.2,1.15),(0,0,.77),65),camera('CAM_Cartoon_Portrait',(.50,-1.15,1.40),(0,-.02,1.30),70)]
scene=bpy.context.scene;scene['Concept']='reference/04-cartoon-traveler-concept.png; generated cartoon target, not model evidence';scene['KnownLimits']='First cartoon sculpt pass. Requires independent visual and deformation approval.'
save(OUT/'04-cartoon-traveler.blend')
report=metrics(objects);report.update({'status':'AWAITING_CARTOON_VISUAL_QA','height_target_m':1.47,'style':'user-directed cartoon little traveler','reference':'reference/04-cartoon-traveler-concept.png'})
(OUT/'04-cartoon-metrics.json').write_text(json.dumps(report,indent=2))
for cam in cams:render(cam,OUT/(cam.name.replace('CAM_','04-')+'.png'),900,1000)
print(json.dumps(report),flush=True)
