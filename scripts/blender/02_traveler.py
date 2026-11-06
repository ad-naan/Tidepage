"""Continuous CC0 human topology, tailored clothing, swept hair and weighted rig.
Run in a separate, empty Blender process. No primitive mannequin is exported.
"""
import sys, math, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from harbor_common import *
fresh()
COL='COL_Traveler'
vs=[];tex=[];groups={};group='';faceuv={}
for line in (ASSETS/'makehuman-base.obj').read_text().splitlines():
    p=line.split()
    if not p:continue
    if p[0]=='v':vs.append(Vector(tuple(map(float,p[1:4]))))
    elif p[0]=='vt':tex.append(tuple(map(float,p[1:3])))
    elif p[0]=='g':group=p[1];groups.setdefault(group,[]);faceuv.setdefault(group,[])
    elif p[0]=='f':
        groups[group].append([int(t.split('/')[0])-1 for t in p[1:]])
        faceuv[group].append([int(t.split('/')[1])-1 for t in p[1:]])
body_ids={i for f in groups['body'] for i in f}
bottom=min(vs[i].y for i in body_ids);top=max(vs[i].y for i in body_ids);s=1.75/(top-bottom)
def raw(v):return Vector((v.x*s,-v.z*s,(v.y-bottom)*s))
def relax(v):
    v=v.copy();side=1 if v.x>0 else -1
    if v.z<1.0 and abs(v.x)<.35:v.x*=.6+.4*min(1,v.z/.95)
    # MakeHuman's base is an A-pose. Lower the arms into a natural relaxed rest pose.
    blend=max(0,min(1,(abs(v.x)-.153)/.05)) if (v.z>1.13 and abs(v.x)>.153) or (v.z>.75 and abs(v.x)>.30) else 0
    if blend:
        anchor=Vector((side*.176,-.015,1.409));d=v-anchor;a=side*.43*blend
        v=anchor+Vector((math.cos(a)*d.x+math.sin(a)*d.z,d.y,-math.sin(a)*d.x+math.cos(a)*d.z))
    return v
original_points=[raw(v) for v in vs]
points=[relax(v) for v in original_points]
def joint(name):
    ids={i for f in groups['joint-'+name] for i in f}
    return sum((points[i] for i in ids),Vector())/len(ids)

skin=material('traveler-skin',(.63,.39,.27),.52)
bs=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Subsurface Weight'].default_value=.08
coat=material('traveler-coat',(.105,.24,.245),.74,texture='fabric')
knit=material('traveler-knit',(.72,.65,.50),.82,texture='fabric')
pants=material('traveler-trousers',(.075,.09,.105),.82,texture='fabric')
leather=material('traveler-leather',(.19,.09,.045),.47,texture='wood')
sole=material('traveler-sole',(.065,.047,.037),.8)
hair=material('traveler-hair',(.12,.055,.026),.42)
hairlight=material('traveler-hair-highlights',(.18,.09,.044),.48)
white=material('traveler-eye-white',(.72,.68,.59),.32)
iris=material('traveler-iris',(.17,.095,.043),.28)
pupil=material('traveler-pupil',(.008,.012,.015),.18)
lip=material('traveler-lips',(.37,.15,.12),.58)
brass=material('traveler-brass',(.54,.33,.11),.35,.7)

def subset(name,predicate,mat,inflate=0,thick=0):
    selected=[];uv=[];ids=set()
    for face,uvface in zip(groups['body'],faceuv['body']):
        center=sum((points[i] for i in face),Vector())/len(face)
        original=sum((original_points[i] for i in face),Vector())/len(face)
        if predicate(center,original):selected.append(face);uv.extend(tex[i] for i in uvface);ids.update(face)
    ids=sorted(ids);remap={old:new for new,old in enumerate(ids)}
    ob=mesh(name,[tuple(points[i]) for i in ids],[tuple(remap[i] for i in f) for f in selected],mat,COL,uvs=uv,smooth=True)
    if inflate:
        for v in ob.data.vertices:
            v.co+=v.normal*inflate
            # Authored garment ease and quiet folds at waist, elbow, cuffs and knees.
            z=v.co.z;fold=(math.sin(z*95+v.co.x*22)*.0017+math.sin(z*43+v.co.y*13)*.002)
            if mat==pants and .15<z<.98:v.co.x+=math.copysign(fold,v.co.x)
            if mat==coat and z<1.18:v.co.x*=1.06;v.co.y*=1.13
            if mat in [coat,knit] and .95<z<1.39 and abs(v.co.x)<.16 and v.co.y<-.07:
                v.co.y=min(v.co.y,-.154-(.012 if mat==coat else 0))
    if mat==coat:
        bm=bmesh.new();bm.from_mesh(ob.data)
        boundary={v for e in bm.edges if e.is_boundary for v in e.verts}
        for v in boundary:
            if v.co.z<1.0 and abs(v.co.x)<.20:v.co.z=.94
            elif v.co.z>1.40 and abs(v.co.x)<.15:v.co.z=1.445
            elif 1.11<v.co.z<1.40 and abs(v.co.x)<.13 and v.co.y<-.07:
                v.co.x=math.copysign(.012+(v.co.z-1.11)*.2,v.co.x)
        bm.to_mesh(ob.data);bm.free()
    if thick:
        mod=ob.modifiers.new('Cloth edge thickness','SOLIDIFY');mod.thickness=thick;mod.offset=-1
    return ob

body=subset('SM_Traveler_ConnectedSkin',lambda p,o:o.z>1.43 or (abs(o.x)>.385 and o.z>.7),skin)
# Hide covered body; sleeves and trousers use the original quad surface, not tubes.
jacket=subset('SM_Traveler_TailoredJacket',lambda p,o:.92<o.z<1.45 and abs(o.x)<.395 and not(o.y<-.075 and o.z>1.11 and abs(o.x)<.012+(o.z-1.11)*.2),coat,.018,.004)
mod=jacket.modifiers.new('Tailored surface smoothing','SUBSURF');mod.levels=1
trousers=subset('SM_Traveler_Trousers',lambda p,o:.105<o.z<1.02 and abs(o.x)<.34,pants,.01,.003)
boots=None
for side in [-1,1]:
    cx=side*.142;verts=[];faces=[];n=24
    for z,rx,ry,cy in [(0.025,.062,.143,-.066),(.045,.069,.151,-.069),(.075,.064,.145,-.065),(.11,.052,.10,-.034),(.15,.047,.058,.001),(.21,.049,.055,.008)]:
        for i in range(n):
            a=i*math.tau/n;verts.append((cx+rx*math.cos(a),cy+ry*math.sin(a),z))
    for j in range(5):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.extend([tuple(reversed(range(n))),tuple(range(n*5,n*6))])
    mesh('SM_Traveler_CraftedAnkleBoot',verts,faces,leather,COL,smooth=True)
    for j in range(5):
        z=.115+j*.014
        sweep('SM_Traveler_BootLace',[(cx-.027,-.081+j*.003,z),(cx+.025,-.081+j*.003,z+.008)],.0018,knit,5,COL)
# A separate inset vest and tailored open lapels create the layered neckline.
vest=subset('SM_Traveler_IvoryVest',lambda p,o:1.04<o.z<1.47 and abs(o.x)<.14 and o.y<-.06,knit,.009,.003)
mod=vest.modifiers.new('Knit surface smoothing','SUBSURF');mod.levels=1
for side in ['l','r']:
    elbow=joint(side+'-elbow');hand=joint(side+'-hand');c=elbow.lerp(hand,.43);d=(hand-elbow).normalized()
    sweep('SM_Traveler_RolledKnitCuff',[c-d*.025,c+d*.025],[.047,.046],knit,16,COL)
collar=[(.074*math.cos(i*math.tau/32),.005+.071*math.sin(i*math.tau/32),1.455) for i in range(33)]
sweep('SM_Traveler_RibbedCollar',collar,.012,knit,8,COL)
for side in [-1,1]:
    mesh('SM_Traveler_FoldedLapel',[(side*.025,-.165,1.18),(side*.12,-.17,1.32),(side*.17,-.13,1.405),(side*.075,-.115,1.475),(side*.055,-.138,1.355)],[(0,1,2,3,4)],coat,COL)
    sweep('SM_Traveler_LapelPiping',[(side*.025,-.168,1.18),(side*.12,-.175,1.32),(side*.17,-.135,1.405),(side*.075,-.12,1.475)],.0015,brass,5,COL)
    sweep('SM_Traveler_PocketWelt',[(side*.075,-.17,1.04),(side*.15,-.15,1.065)],.004,leather,6,COL)
    # Genuine outsole follows the authored foot surface.
    foot=[p for p in points[:len(vs)] if p.z<.065 and p.x*side>0]
    x=sum(p.x for p in foot)/len(foot)
    box('SM_Traveler_BootOutsole',(x,-.075,.019),(.135,.285,.033),sole,COL,.012)
for z in [1.065,1.16,1.255]:sphere('SM_Traveler_JacketButton',(.035,-.174,z),(.007,.004,.007),brass,12,6,COL)

# Eyes sit inside the original concentric eyelid topology. Small pupils and wet highlights.
eyes=[]
for side in ['l','r']:
    c=joint(side+'-eye');c.y-=.002
    eyes.append(sphere('SM_Traveler_Eye_'+side,c,(.014,.0135,.014),white,24,12,COL))
    sphere('SM_Traveler_Iris_'+side,(c.x,c.y-.0132,c.z),(.0063,.0018,.0063),iris,24,10,COL)
    sphere('SM_Traveler_Pupil_'+side,(c.x,c.y-.0149,c.z),(.0028,.0008,.0033),pupil,20,8,COL)
    sphere('SM_Traveler_EyeGlint_'+side,(c.x-.0019,c.y-.0155,c.z+.0024),(.0011,.0006,.0011),white,12,6,COL)
    sweep('SM_Traveler_Eyebrow_'+side,[(c.x-.021,c.y-.018,c.z+.025),(c.x-.008,c.y-.022,c.z+.030),(c.x+.009,c.y-.019,c.z+.028),(c.x+.02,c.y-.010,c.z+.022)],[.0018,.003,.0026,.0008],hair,6,COL)
# Continuous vertex tints avoid a jagged lipstick-shaped material boundary.
attr=body.data.color_attributes.new(name='SkinTint',type='FLOAT_COLOR',domain='CORNER')
for polygon in body.data.polygons:
    for li in polygon.loop_indices:
        p=body.data.vertices[body.data.loops[li].vertex_index].co
        mouth=math.exp(-((p.x/.029)**6+((p.z-1.548)/.008)**4))*max(0,min(1,(-p.y-.12)*45))
        cheek=math.exp(-(((abs(p.x)-.047)/.025)**2+((p.z-1.588)/.021)**2))*max(0,min(1,(-p.y-.08)*20))*.25
        c=Vector((.63,.39,.27)).lerp(Vector((.40,.15,.12)),mouth*.8).lerp(Vector((.65,.30,.23)),cheek)
        attr.data[li].color=(*c,1)
vc=skin.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='SkinTint'
skin.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
mod=body.modifiers.new('Facial and finger surface refinement','SUBSURF');mod.levels=1

# Scalp surface follows the head mesh, with a shaped hairline and no floating cap.
scalp=subset('SM_Traveler_HairScalp',lambda p,o:p.z>1.635 and (p.y>-.075 or p.z>1.698),hair,.004)
mod=scalp.modifiers.new('Scalp surface refinement','SUBSURF');mod.levels=2
hc=Vector((0,.005,1.655))
for i in range(42):
    a=i*math.tau/42;right=i%2==0
    start=Vector((.012*math.cos(a),.005+math.sin(a)*.023,1.756))
    side=1 if math.cos(a)>0 else -1
    end=Vector((side*(.067+.012*math.sin(i*3)),.025+.067*math.sin(a),1.635+.027*math.sin(i*1.7)))
    if math.sin(a)<-.25:end.y=-.093;end.z=1.661+.014*math.sin(i)
    mid=Vector((side*.065,.005+.08*math.sin(a),1.74+.015*math.sin(i)))
    sweep('SM_Traveler_SweptHairLock',[start,start.lerp(mid,.55)+Vector((0,0,.008)),mid,mid.lerp(end,.65)+Vector((side*.007,0,.006)),end],[.006,.013,.016,.012,.001],hair,7,COL)
    if i%3==0:sweep('SM_Traveler_HairStrand',[start+Vector((0,-.001,.005)),mid+Vector((0,-.002,.01)),end+Vector((0,-.002,.002))],[.0006,.0013,.0003],hairlight,4,COL)

# Small layered leather satchel, brass closures, and a curved flat strap.
bag=box('SM_Traveler_AccessorySatchel',(-.215,-.015,1.00),(.16,.085,.19),leather,COL,.025)
box('SM_Traveler_SatchelFlap',(-.215,-.065,1.06),(.169,.012,.09),leather,COL,.012)
box('SM_Traveler_SatchelClasp',(-.215,-.076,1.025),(.025,.007,.028),brass,COL,.004)
sweep('SM_Traveler_SatchelStrap',[(-.21,-.02,1.08),(-.14,-.166,1.2),(.015,-.177,1.34),(.145,-.105,1.435),(.16,.04,1.40),(-.21,.10,1.08)],.012,leather,6,COL)

# Rest skeleton. All weighted surfaces are continuous; no floating joint primitives.
arm_data=bpy.data.armatures.new('ARM_Traveler');arm=bpy.data.objects.new('ARM_Traveler',arm_data);collection(COL).objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
specs=[('hips',Vector((0,0,.91)),Vector((0,0,1.05)),None),('spine',Vector((0,0,1.05)),Vector((0,0,1.3)),'hips'),('chest',Vector((0,0,1.3)),Vector((0,0,1.46)),'spine'),('head',joint('neck'),joint('head-2'),'chest')]
for side in ['l','r']:
    specs.extend([(f'upper_arm.{side}',joint(side+'-shoulder'),joint(side+'-elbow'),'chest'),(f'forearm.{side}',joint(side+'-elbow'),joint(side+'-hand'),f'upper_arm.{side}'),(f'hand.{side}',joint(side+'-hand'),joint(side+'-hand')+Vector((0,-.02,-.08)),f'forearm.{side}'),(f'thigh.{side}',joint(side+'-upper-leg'),joint(side+'-knee'),'hips'),(f'shin.{side}',joint(side+'-knee'),joint(side+'-ankle'),f'thigh.{side}'),(f'foot.{side}',joint(side+'-ankle'),joint(side+'-ankle')+Vector((0,-.14,-.02)),f'shin.{side}')])
for name,h,t,parent in specs:
    b=arm_data.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');arm.select_set(False)

objects=[o for o in collection(COL).objects if o.type=='MESH']
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
face_bvh=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
for ob in objects:
    if 'Eyebrow' in ob.name:
        for v in ob.data.vertices:
            hit,normal,index,distance=face_bvh.ray_cast(Vector((v.co.x,-1,v.co.z)),Vector((0,1,0)))
            if hit:v.co.y=hit.y-.0015
for ob in objects:
    apply_modifiers(ob)
    if ob in [body,jacket,vest,trousers,scalp]:
        dec=ob.modifiers.new('Game mesh optimization','DECIMATE');dec.ratio=.42 if ob==body else .24 if ob in [jacket,vest] else .6
        apply_modifiers(ob)
    # Smooth inverse-distance weights to anatomical segments, with a regional shortlist.
    vgroups={name:ob.vertex_groups.new(name=name) for name,_,_,_ in specs}
    rigid='head' if any(t in ob.name for t in ['Hair','Eye','Iris','Pupil']) else 'chest' if any(t in ob.name for t in ['Satchel','Lapel','Vest','Pocket','Button']) else None
    for v in ob.data.vertices:
        p=v.co
        if rigid:vgroups[rigid].add([v.index],1,'REPLACE');continue
        side='l' if p.x>0 else 'r'
        names=(['head','chest'] if p.z>1.47 else [f'upper_arm.{side}',f'forearm.{side}',f'hand.{side}'] if abs(p.x)>.19 and p.z>1.0 else [f'thigh.{side}',f'shin.{side}',f'foot.{side}','hips'] if p.z<1.0 else ['hips','spine','chest','head'])
        distances=[]
        for name,a,b,parent in specs:
            if name not in names:continue
            d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));dist=(p-a-t*d).length
            distances.append((dist,name))
        nearest=sorted(distances)[:2];weights=[1/(d+.012)**5 for d,_ in nearest];total=sum(weights)
        for (_,name),w in zip(nearest,weights):vgroups[name].add([v.index],w/total,'REPLACE')
    mod=ob.modifiers.new('Weighted character rig','ARMATURE');mod.object=arm;ob.parent=arm

scene=bpy.context.scene
scene['Concept']='reference/02-traveler-and-bay-concept.png; generated target, not model evidence'
scene['Source']='MakeHuman CC0 base topology; custom relaxed proportions, clothing, hair, materials and skinning'
scene['KnownLimits']='Facial expression morphs and alternate hair silhouettes are not authored in this checkpoint'
lighting(True)
floor=box('REVIEW_Ground',(0,0,-.026),(200,200,.04),material('review-ground',(.28,.30,.30)), 'COL_Review')
cams=[camera('CAM_Traveler_Front',(1.7,-3.8,1.4),(0,0,.94),65),camera('CAM_Traveler_Profile',(3.8,-.4,1.4),(0,0,.94),65),camera('CAM_Traveler_Back',(1.6,3.6,1.4),(0,0,.94),65),camera('CAM_Traveler_Portrait',(.55,-1.15,1.69),(0,-.02,1.61),75)]
save(OUT/'02-traveler.blend')
report=metrics(objects);report.update({'height_m':1.78,'source':'MakeHuman CC0 continuous body mesh','status':'AWAITING_GEOMETRY_AND_VISUAL_QA','rig_bones':len(specs)})
(OUT/'02-traveler-metrics.json').write_text(json.dumps(report,indent=2))
for cam in cams:render(cam,OUT/(cam.name.replace('CAM_','02-')+'.png'),900,1000)
print(json.dumps(report),flush=True)
