"""Authored full-bay environment: connected shore, modular inhabited buildings,
curved clay shingles, individually branched leafy trees and coastal masonry.
Deterministic data-API construction; never run inside the user's active file.
"""
import sys,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from harbor_common import *
from mathutils.geometry import tessellate_polygon
fresh()
P={
 'sand':material('bay-sand',(.64,.51,.32),.95,texture='stone'),
 'grass':material('bay-ground-moss',(.19,.255,.10),.92,texture='stone'),
 'stone':material('bay-limestone',(.42,.42,.32),.88,texture='stone'),
 'rock':material('bay-coastal-rock',(.24,.28,.26),.92,texture='stone'),
 'wall':material('bay-warm-lime-plaster',(.67,.57,.40),.93,texture='stone'),
 'wood':material('bay-aged-oak',(.23,.125,.061),.78,texture='wood'),
 'door':material('bay-teal-painted-wood',(.075,.22,.195),.7,texture='wood'),
 'roof':material('bay-clay-shingles',(.30,.105,.052),.83,texture='stone'),
 'roof2':material('bay-clay-shingles-light',(.39,.17,.085),.85,texture='stone'),
 'rope':material('bay-hemp-rope',(.48,.36,.20),.95,texture='fabric'),
 'metal':material('bay-aged-brass',(.24,.17,.075),.39,.65),
 'glass':material('seed-lantern-light',(.81,.51,.17),.35),
 'leaf':material('bay-leaf-sage',(.15,.245,.072),.78),
 'leaf2':material('bay-leaf-sunlit',(.26,.34,.085),.8),
 'flower':material('bay-lilac-petals',(.34,.19,.45),.8),
 'linen':material('bay-warm-linen',(.68,.60,.44),.9,texture='fabric'),
 'water':material('bay-review-water',(.055,.30,.32),.23,.1),
}
bs=next(n for n in P['glass'].node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Emission Color'].default_value=(1,.55,.15,1);bs.inputs['Emission Strength'].default_value=.6
outline=[(-70,25),(-75,0),(-68,-35),(-52,-65),(-20,-85),(20,-85),(52,-65),(68,-35),(75,0),(70,25),(48,30),(40,20),(31,15),(16,8),(0,5),(-16,8),(-31,15),(-40,20),(-48,30)]
def polygon(name,outline,z,mat,depth=.15):
    top=[Vector((x,-y,z)) for x,y in outline];n=len(top);lookup={tuple(v):i for i,v in enumerate(top)}
    triangles=tessellate_polygon([top]);fs=[tuple(i if isinstance(i,int) else lookup[tuple(i)] for i in f) for f in triangles]
    center=sum(top,Vector())/n
    vs=[tuple(v) for v in top]+[(v.x+(v.x-center.x)*.025,v.y+(v.y-center.y)*.025,z-depth) if depth>1 else (v.x,v.y,z-depth) for v in top]
    fs += [tuple(reversed([i+n for i in f])) for f in fs[:]]
    fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vs,fs,mat)
polygon('SM_Bay_ContinuousCrescent_150m',outline,.435,P['sand'],3)
grassoutline=[(-65,15),(-68,0),(-61,-34),(-49,-63),(-20,-79),(20,-79),(49,-63),(61,-34),(68,0),(65,15),(47,22),(38,13),(30,7),(15,1),(0,-1),(-15,1),(-30,7),(-38,13),(-47,22)]
polygon('SM_Bay_OrganicMeadow',grassoutline,.448,P['grass'],.008)

def noise_rock(name,center,size,mat=None):
    ob=sphere(name,center,size,mat or P['rock'],12,6)
    for v in ob.data.vertices:
        d=v.co-Vector(center);f=1+.13*math.sin(d.x*7+d.y*4)+.07*math.cos(d.z*8-d.x*3);v.co=Vector(center)+d*f
    return ob

# Eroded cliffs are layered meshes with undercuts and weathered blocks, not a flat backdrop.
for side in [-1,1]:
    for i in range(10):
        x=side*(57+math.sin(i*.5)*7);y=8+i*6;h=5+3*math.sin(i*.7)**2
        # Fractured stratified rock faces: asymmetric cross-sections with horizontal strata.
        vs=[];n=10;layers=[-.8,1.1,2.3,3.7,h]
        for layer,z in enumerate(layers):
            for j in range(n):
                a=j*math.tau/n;radius=1+.13*math.sin(j*4.1+i)+.08*math.sin(layer*2+j)
                vs.append((x+math.cos(a)*4.5*radius,y+math.sin(a)*4.9*radius,z+.15*math.sin(j*3+layer)))
        fs=[tuple(reversed(range(n))),tuple(range((len(layers)-1)*n,len(layers)*n))]
        fs += [(l*n+j,l*n+(j+1)%n,(l+1)*n+(j+1)%n,(l+1)*n+j) for l in range(len(layers)-1) for j in range(n)]
        mesh('SM_Cliff_FracturedStrata',vs,fs,P['stone'])
for x in range(-45,46,9):
    vs=[];n=12
    for level,z in enumerate([-.5,2,4,6,8]):
        for j in range(n):
            a=j*math.tau/n;r=1+.13*math.sin(j*4+x)+.06*math.cos(level*2+j)
            vs.append((x+math.cos(a)*6.3*r,77+math.sin(a)*5*r,z+.35*math.sin(x+j*2)))
    fs=[tuple(reversed(range(n))),tuple(range(n*4,n*5))]+[(l*n+j,l*n+(j+1)%n,(l+1)*n+(j+1)%n,(l+1)*n+j) for l in range(4) for j in range(n)]
    mesh('SM_Cliff_LayeredRearHeadland',vs,fs,P['stone'])

def path(points,width=2.6):
    for a,b in zip(points,points[1:]):
        a=Vector((a[0],-a[1],.46));b=Vector((b[0],-b[1],.46));d=b-a;normal=Vector((-d.y,d.x,0)).normalized()
        rows=math.ceil(d.length/.6)
        for j in range(rows):
            c=a+d*((j+.5)/rows)
            for side in [-1,0,1]:
                p=c+normal*(side*width*.31+(RNG.random()-.5)*.05)
                ob=box('SM_Path_HandLaidFlagstone',p,(width*.30,.53,.045),P['stone'],bevel=.045)
                for v in ob.data.vertices:v.co-=p
                ob.location=p
                ob.rotation_euler.z=math.atan2(d.y,d.x)-math.pi/2+(RNG.random()-.5)*.08
routes=[[(0,3),(0,-10),(0,-22)],[(0,-22),(-10,-24),(-22,-31)],[(-22,-31),(-40,-38),(-42,-49)],[(0,-22),(10,-20),(22,-32),(28,-53)],[(-42,-49),(-20,-59),(0,-62),(28,-53)],[(0,-4),(4.5,-.1)],[(-1,2),(-5,-1.5)]]
for route in routes:path(route,2.8)
print('CHECKPOINT geometry: terrain and routes built',flush=True)
# The forum is a generous 18m across, with a real perimeter and central empty gathering space.
for ring in range(9):
    radius=.5+ring;count=max(8,int(radius*math.tau/.58))
    for i in range(count):
        a=i*math.tau/count;cx=math.cos(a)*radius;cy=22+math.sin(a)*radius
        ob=box('SM_Forum_RadialPavers',(cx,cy,.47),(.5,.52,.045),P['stone'],bevel=.035);ob.rotation_euler.z=a
        for v in ob.data.vertices:v.co-=Vector((cx,cy,.47))
        ob.location=(cx,cy,.47)

# Arrival pier: 21m continuous deck, proper substructure, ropes with visible sag.
for i in range(62):box('SM_Pier_IndividualOakPlank',(0,-(-1+i*.34),.45),(3.35,.315,.12),P['wood'],bevel=.014)
for side in [-1,1]:
    for gz in [-.5,3,6.5,10,13.5,17,20]:
        x=side*1.62;y=-gz
        sweep('SM_Pier_Pile',[(x,y,-1.1),(x+.025,y,.8)],[.13,.105],P['wood'],10)
        for k in range(4):
            pts=[(x+math.cos(t*math.tau/24)*.112,y+math.sin(t*math.tau/24)*.112,.58+k*.027) for t in range(25)]
            sweep('SM_Pier_HempLashing',pts,.014,P['rope'],5)
        if gz<20:
            sweep('SM_Pier_SaggingHandRope',[(x,y,.8),(x,y-1.75,.58),(x,y-3.5,.8)],.021,P['rope'],6)

def lantern(x,y,z,standing=True):
    if standing:
        sweep('SM_Lantern_OakPost',[(x,y,.45),(x,y,z+.25)],[.065,.055],P['wood'],8)
        sweep('SM_Lantern_CurvedBracket',[(x,y,z+.1),(x+.20,y,z+.28),(x+.38,y,z+.12)],.025,P['metal'],6)
        x+=.38
    box('SM_Lantern_GlowingPane',(x,y,z-.12),(.17,.17,.27),P['glass'],bevel=.008)
    for sx in [-1,1]:
        for sy in [-1,1]:box('SM_Lantern_Corner',(x+sx*.1,y+sy*.1,z-.12),(.025,.025,.33),P['metal'])
    box('SM_Lantern_Cap',(x,y,z+.07),(.26,.26,.055),P['metal'],bevel=.025)
    box('SM_Lantern_Base',(x,y,z-.3),(.24,.24,.045),P['metal'],bevel=.015)
for x,y,z in [(-1.6,-17,1.7),(1.6,-6.5,1.7),(-9,20,2.1),(9,20,2.1),(-19,28,2.1),(22,37,2.1)]:lantern(x,y,z)

def window(cx,fy,z,width=.85,height=1.1):
    box('SM_Window_DeepReveal',(cx,fy+.035,z),(width+.12,.12,height+.12),P['wood'])
    box('SM_Window_HoneyGlass',(cx,fy-.037,z),(width,.025,height),P['glass'])
    for sx in [-1,1]:box('SM_Window_SideTrim',(cx+sx*(width/2+.03),fy-.075,z),(.065,.08,height+.25),P['door'],bevel=.01)
    for sz in [-1,1]:box('SM_Window_HorizontalTrim',(cx,fy-.075,z+sz*(height/2+.05)),(width+.22,.1,.07),P['door'],bevel=.01)
    box('SM_Window_Mullion',(cx,fy-.075,z),(.035,.05,height),P['wood'])
    box('SM_Window_Crossbar',(cx,fy-.075,z+.08),(width,.05,.035),P['wood'])
    box('SM_Window_ProjectingSill',(cx,fy-.14,z-height/2-.11),(width+.28,.34,.1),P['stone'],bevel=.025)

def house(cx,gy,width=5.5,depth=5.5,hero=False):
    cy=-gy;fy=cy-depth/2;by=cy+depth/2;left=cx-width/2;right=cx+width/2;floor=.46;eave=3.08;ridge=4.55
    before=set(bpy.data.objects);roof_objects=[];shell_objects=[]
    # Continuous foundations support every wall, leaving a real door at x=4.5 for the hero.
    doorx=4.5 if hero else cx;dw=1.10;door_top=2.7
    box('SM_House_Floor',(cx,cy,.445),(width,.08,depth),P['wood'])
    for y in [fy,by]:
        for i in range(math.ceil(width/.53)):
            x=left+(i+.5)*width/math.ceil(width/.53)
            box('SM_House_FoundationStone',(x,y,.62),(.51,.36,.3),P['stone'],bevel=.035)
    box('SM_House_RearWall',(cx,by,1.90),(width,.22,2.38),P['wall'])
    for x in [left,right]:box('SM_House_SideWall',(x,cy,1.90),(.22,depth,2.38),P['wall'])
    # Door and two window openings assembled as solids around empty spaces.
    front_features=[(left,doorx-dw/2),(doorx+dw/2,right)]
    for lo,hi in front_features:
        if hi-lo<.8:continue
        wc=(lo+hi)/2;ww=min(.86,(hi-lo)-.30);wl=wc-ww/2;wr=wc+ww/2;bottom=1.25;top=2.35
        for a,b in [(lo,wl),(wr,hi)]:box('SM_House_FrontPier',((a+b)/2,fy,1.9),(b-a,.22,2.38),P['wall'])
        box('SM_House_WindowApron',(wc,fy,(.73+bottom)/2),(ww,.22,bottom-.73),P['wall'])
        box('SM_House_WindowHead',(wc,fy,(top+eave)/2),(ww,.22,eave-top),P['wall'])
        window(wc,fy-.10,(bottom+top)/2,ww,top-bottom)
    box('SM_House_DoorHeader',(doorx,fy,(door_top+eave)/2),(dw,.22,eave-door_top),P['wall'])
    for y in [fy,by]:
        mesh('SM_House_SealedGable',[(left,y-.11,eave),(right,y-.11,eave),(cx,y-.11,ridge),(left,y+.11,eave),(right,y+.11,eave),(cx,y+.11,ridge)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],P['wall'])
    for x in [left,right]:
        for y in [fy,by]:box('SM_House_CornerTimber',(x,y,1.96),(.15,.16,2.22),P['wood'],bevel=.015)
    for y in [fy-.13,by+.13]:box('SM_House_EaveWallPlate',(cx,y,eave-.02),(width+.25,.19,.20),P['wood'],bevel=.016)
    shell_objects=[o for o in set(bpy.data.objects)-before if 'Floor' not in o.name and 'Foundation' not in o.name]
    # Curved overlapping clay shingles; roof underside is continuous and rests on the wall plate.
    roof_before=set(bpy.data.objects)
    half=width/2+.4;length=depth+.8;rows=9;columns=math.ceil(length/.34)
    def roof_height(x):return ridge-(ridge-eave)*((abs(x)/half)**.88)+.04
    for side in [-1,1]:
        vsroof=[]
        for y in [fy-.4,by+.4]:
            for j in range(13):
                dx=side*half*j/12;vsroof.append((cx+dx,y,roof_height(dx)-.08))
        mesh('SM_Roof_ContinuousTimberSubstrate',vsroof,[(i,i+1,14+i,13+i) for i in range(12)],P['wood'])
        for row in range(rows):
            for column in range(columns):
                x0=half*row/rows;x1=min(half,x0+half/rows+.08);y0=fy-.4+column*length/columns;y1=y0+length/columns+.025
                v=[]
                for x,y,t in [(x0,y0,0),(x0,y1,0),(x1,y1,0),(x1,y0,0),(x0,y0,.045),(x0,y1,.045),(x1,y1,.045),(x1,y0,.045)]:
                    v.append((cx+side*x,y,roof_height(x)+t+.035*math.sin((y-y0)/(y1-y0)*math.pi)))
                mesh('SM_Roof_HandmadeClayShingle',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],P['roof'] if RNG.random()<.7 else P['roof2'])
        for y in [fy-.43,by+.43]:
            points=[(cx+side*half*j/8,y,roof_height(side*half*j/8)-.055) for j in range(9)]
            sweep('SM_Roof_ConnectedBargeboard',points,.075,P['wood'],8)
    for j in range(columns):
        y=fy-.43+j*length/columns
        sweep('SM_Roof_RidgeCap',[(cx-.1,y,ridge+.07),(cx,y,ridge+.16),(cx+.1,y,ridge+.07)],.045,P['roof2'],7)
    roof_objects=list(set(bpy.data.objects)-roof_before)
    # Chimney stacks visibly penetrate the roof, with flashed collars around the joint.
    chimx=cx-width*.28;chimy=cy+depth*.26;chimbottom=roof_height(chimx-cx)-.12
    box('SM_Chimney_Flashing',(chimx,chimy,chimbottom+.13),(.74,.74,.19),P['metal'],bevel=.03)
    for k in range(7):
        for j in [-1,1]:box('SM_Chimney_Stone',(chimx+j*.145,chimy,chimbottom+.16+k*.14),(.28,.48,.13),P['stone'],bevel=.015)
    box('SM_Chimney_Cap',(chimx,chimy,chimbottom+1.17),(.71,.68,.12),P['stone'],bevel=.03)
    # Operable door pivot at the actual jamb, plus individually framed recessed boards.
    door_group=bpy.data.objects.new('harbor_door' if hero else 'Door_Residence',None);collection('COL_Assets').objects.link(door_group);door_group.location=(doorx-dw/2,fy-.10,floor)
    door_parts=[]
    for j in range(6):door_parts.append(box('SM_Door_RecessedBoard',(doorx-dw/2+(j+.5)*dw/6,fy-.12,1.58),(dw/6-.008,.10,2.22),P['door'],bevel=.006))
    for z in [.65,2.49]:door_parts.append(box('SM_Door_CrossRail',(doorx,fy-.185,z),(dw-.08,.035,.09),P['wood'],bevel=.008))
    door_parts.append(sphere('SM_Door_BrassKnob',(doorx+.34,fy-.22,1.52),(.035,.035,.035),P['metal'],16,8))
    for ob in door_parts:
        ob.parent=door_group;ob.matrix_parent_inverse=door_group.matrix_world.inverted()
        # Matrices update below; preserve authored world positions explicitly.
        ob.location=-door_group.location
    for x in [doorx-dw/2-.09,doorx+dw/2+.09]:box('SM_Door_StoneJamb',(x,fy-.10,1.6),(.16,.31,2.30),P['stone'],bevel=.025)
    box('SM_Door_Lintel',(doorx,fy-.10,2.77),(dw+.48,.34,.19),P['stone'],bevel=.035)
    for k in range(2):box('SM_Door_ThresholdStep',(doorx,fy-.28-k*.22,.47+k*.05),(1.5,.60,.1),P['stone'],bevel=.025)
    lantern(doorx+1.05,fy-.35,2.20,False)
    if hero:
        for name,objects in [('harbor_house_roof',roof_objects),('harbor_house_shell',shell_objects)]:
            parent=bpy.data.objects.new(name,None);collection('COL_Assets').objects.link(parent)
            for o in objects:o.parent=parent
        # Warm inhabitable interior, fitted to the existing movement obstacles.
        box('SM_Interior_BedFrame',(5.35,4.12,.68),(1.15,1.5,.30),P['wood'],bevel=.04)
        box('SM_Interior_Quilt',(5.35,4.12,.90),(1.14,1.48,.18),P['linen'],bevel=.075)
        box('SM_Interior_Pillow',(5.35,4.65,1.01),(.77,.38,.15),P['linen'],bevel=.08)
        box('SM_Interior_WritingDesk',(2.5,4.48,1.25),(.95,.7,.10),P['wood'],bevel=.03)
        for x in [2.12,2.88]:
            for y in [4.2,4.75]:box('SM_Interior_DeskLeg',(x,y,.83),(.07,.07,.75),P['wood'])
        for i in range(5):box('SM_Interior_Book',(2.26+i*.09,4.58,1.39),(.065,.27,.22),P['door'],bevel=.008)
        box('SM_Interior_FireplaceMantel',(5.72,2.12,1.32),(.67,1.12,.18),P['stone'],bevel=.035)
        for y in [1.64,2.6]:box('SM_Interior_FireplacePillar',(5.72,y,.9),(.65,.18,.75),P['stone'],bevel=.03)
        fire=box('harbor_hearth',(5.7,2.12,.78),(.35,.65,.25),P['glass'],bevel=.05)
    return list(set(bpy.data.objects)-before)

house(4.05,-3.25,hero=True)
house(-15,-23,5.7,5.4);house(15,-28,5.7,5.4);house(24,-43,5.7,5.4)
print('CHECKPOINT geometry: four joined-roof cottages built',flush=True)

def bench(x,gy,width=3):
    y=-gy
    for k in range(4):box('SM_Bench_SeatSlat',(x,y+k*.12,.91),(width,.105,.065),P['wood'],bevel=.014)
    for k in range(3):box('SM_Bench_BackSlat',(x,y+.41,1.1+k*.17),(width,.07,.13),P['wood'],bevel=.014)
    for side in [-1,1]:
        xx=x+side*(width/2-.20)
        sweep('SM_Bench_CurvedIronLeg',[(xx,y-.03,.46),(xx,y+.05,.87),(xx,y+.4,.87),(xx,y+.46,.46)],.032,P['metal'],7)
        sweep('SM_Bench_Armrest',[(xx,y-.07,.9),(xx,y-.04,1.13),(xx,y+.36,1.13),(xx,y+.42,1.4)],.027,P['metal'],7)
bench(-5,-2.17);bench(-6,-23.17);bench(6,-23.17)

def pot(x,y,z=.45,scale=1):
    points=[(.0,.0),(.16,.0),(.22,.07),(.25,.34),(.20,.44),(.23,.46),(.23,.51),(.16,.51),(.16,.45),(.18,.36),(.14,.08),(.0,.08)]
    vs=[];n=16
    for r,h in points:
        for i in range(n):a=i*math.tau/n;vs.append((x+math.cos(a)*r*scale,y+math.sin(a)*r*scale,z+h*scale))
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(points)-1) for i in range(n)]
    mesh('SM_Props_ThrownTerracottaPot',vs,fs,P['roof2'],smooth=True)
    for j in range(7):
        a=j*2.4;end=(x+math.cos(a)*.16*scale,y+math.sin(a)*.16*scale,z+(.75+RNG.random()*.25)*scale)
        sweep('SM_Flower_Stem',[(x,y,z+.40*scale),end],.007*scale,P['leaf'],5)
        sphere('SM_Flower_LilacBlossom',end,(.055*scale,.05*scale,.065*scale),P['flower'],8,4)
for x,y,scale in [(1,0,1),(6.8,0,1.2),(-17,19,1.2),(-12,19,1.2),(11.5,24,1),(18,24,1),(20.5,39,1.4),(27.5,39,1)]:pot(x,y,.45,scale)

# Branched broadleaf trees; every leaf grows from a twig, with actual tapered blade geometry.
trees=[(-8,-3.7,1.03),(-7,-5.4,.87),(-2.4,-6.5,1.08),(.3,-7,.84),(8,-4.5,.92),(7.2,-5.6,.75),(-24,-14,1.5),(-31,-18,1.8),(-39,-24,1.6),(21,-20,1.5),(30,-27,1.8),(38,-30,1.7),(-11,-31,1.4),(-17,-42,1.8),(7,-40,1.4),(15,-47,1.6),(-38,-49,1.6),(-45,-43,1.7),(28,-58,1.8),(36,-61,1.4)]
def tree(x,gy,scale,index):
    y=-gy;s=scale;before=set(bpy.data.objects)
    trunk=[(x,y,.44),(x-.12*s,y+.05*s,1.5*s),(x+.15*s,y-.08*s,2.7*s),(x+.05*s,y,3.9*s)]
    sweep('SM_Tree_ContinuousTrunk',trunk,[.23*s,.19*s,.13*s,.045*s],P['wood'],10)
    leafvs=[[],[]];leaffs=[[],[]]
    for branch in range(8):
        a=branch*2.4+index*.34;h=(3.7+.55*math.sin(branch*2))*s;reach=(1.4+.5*math.sin(branch))*s
        anchor=Vector((x+.08*s,y,2.1*s+branch%3*.31*s))
        tip=Vector((x+math.cos(a)*reach,y+math.sin(a)*reach,h))
        mid=anchor.lerp(tip,.6)+Vector((0,0,.3*s))
        sweep('SM_Tree_SweptBough',[anchor,mid,tip],[.09*s,.055*s,.009*s],P['wood'],7)
        for twig in range(7):
            u=(twig+1)/8;start=mid.lerp(tip,u)
            ta=a+(-1 if twig%2 else 1)*(.65+twig*.13)
            end=start+Vector((math.cos(ta)*.65*s,math.sin(ta)*.65*s,(.12+.15*math.sin(twig))*s))
            sweep('SM_Tree_TerminalTwig',[start,start.lerp(end,.6)+Vector((0,0,.09*s)),end],[.012*s,.007*s,.002*s],P['wood'],5)
            axis=(end-start).normalized();n=axis.cross(Vector((0,0,1))).normalized()
            for k in range(8):
                c=start.lerp(end,(k+1)/9);side=-1 if k%2 else 1
                direction=(n*side*.8+axis*.2+Vector((0,0,.25))).normalized()
                length=(.28+.08*RNG.random())*s;width=length*.50
                base=c;tipv=c+direction*length;center=c+direction*length*.5
                tangent=direction.cross(Vector((0,0,1))).normalized()*width
                points=[base,center+tangent,tipv,center-tangent,center+Vector((0,0,.012*s)),center-Vector((0,0,.002*s))]
                variant=(k+twig)%2;offset=len(leafvs[variant]);leafvs[variant].extend(tuple(p) for p in points)
                leaffs[variant].extend(tuple(offset+i for i in f) for f in [(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,5,1),(1,5,2),(2,5,3),(3,5,0)])
    for i in range(2):mesh('SM_Tree_IndividualLeaves',leafvs[i],leaffs[i],P['leaf' if i==0 else 'leaf2'],smooth=True)
    return list(set(bpy.data.objects)-before)
for i,(x,y,s) in enumerate(trees):tree(x,y,s,i)
print('CHECKPOINT geometry: twenty branched broadleaf trees built',flush=True)

# A tidal pond and worn stone bank occupy the same collision footprint as navigation.
pond=[(-30+math.cos(i*math.tau/40)*6.45,-32+math.sin(i*math.tau/40)*7.95) for i in range(40)]
polygon('SM_Grove_TidalPool',pond,.465,P['water'],.12)
for i in range(28):
    a=i*math.tau/28;noise_rock('SM_Grove_WornPondStone',(-30+math.cos(a)*6.5,32-math.sin(a)*8,.45),(.55,.46,.35),P['stone'])

# Joined voussoir arches, not disconnected hovering blocks.
for arch in range(3):
    x=23+arch*4.9;y=55+math.sin(arch)*1.3;radius=2.1;thick=.38
    for side in [-1,1]:
        for j in range(5):box('SM_Ruin_PillarCourse',(x+side*radius,y,.68+j*.39),(.61,.74,.36),P['stone'],bevel=.045)
    for j in range(13):
        a=j*math.pi/13;b=(j+1)*math.pi/13;vs=[]
        for yy in [y-.37,y+.37]:
            for r,t in [(radius-.3,a),(radius-.3,b),(radius+.3,b),(radius+.3,a)]:vs.append((x+math.cos(t)*r,yy,2.43+math.sin(t)*r))
        mesh('SM_Ruin_WornVoussoir',vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],P['stone'])

# West lookout: deck and coherent railing, placed on reachable flat terrain.
for j in range(22):box('SM_Lookout_OakDeck',(-42,49+(j-11)*.30,.49),(8,.28,.13),P['wood'],bevel=.012)
for x in [-46,-38]:
    for y in [46,49,52]:
        sweep('SM_Lookout_RailingPost',[(x,y,.44),(x,y,1.5)],.07,P['wood'],8)
    sweep('SM_Lookout_Handrail',[(x,46,1.46),(x,52,1.46)],.06,P['wood'],8)

# Merge only unparented static geometry. Door pivots and roof cutaway groups remain separate.
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
static=[o for o in objects if o.parent is None and o.name!='harbor_hearth']
print('CHECKPOINT batching',len(static),'static objects',flush=True)
merge_materials(static,'SM_Bay_Batched')
for parent_name in ['harbor_house_roof','harbor_house_shell']:
    parent=bpy.data.objects.get(parent_name)
    children=merge_materials([o for o in parent.children if o.type=='MESH'],parent_name+'_mesh')
    for o in children:o.parent=parent
for parent in [o for o in bpy.context.scene.objects if o.type=='EMPTY' and 'Door' in o.name or o.name=='harbor_door']:
    children=[o for o in parent.children if o.type=='MESH']
    merged=merge_materials(children,parent.name+'_mesh')
    # merge_materials bakes world coordinates, restore child-local transforms.
    for o in merged:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
objects=[o for o in bpy.context.scene.objects if o.type in ['MESH','EMPTY']]
lighting()
water=box('REVIEW_Sea',(0,0,-.25),(400,400,.12),P['water'],'COL_Review')
cams=[camera('CAM_Bay_Arrival',(6,-16,3.0),(2,8,2),30),camera('CAM_Bay_Courtyard',(-10,14,2.4),(12,30,2.4),30),camera('CAM_Bay_Aerial',(97,-95,100),(0,24,0),43)]
scene=bpy.context.scene;scene['Concept']='reference/02-traveler-and-bay-concept.png; generated target only';scene['Authoring']='Direct custom mesh, layered architecture, branched leaves and packed authored PBR maps'
save(OUT/'03-bay-environment.blend')
report=metrics(objects);report.update({'status':'AWAITING_GEOMETRY_AND_VISUAL_QA','extent_m':[150,115],'shore_outline':outline,'tree_trunks':trees,'pier_length_m':21,'house_count':4,'door_clearance_m':[1.1,2.22],'known_limits':['No distant house interiors','LOD variants not authored','Collision must be synchronized with runtime outline and pier before shipping']})
(OUT/'03-bay-metrics.json').write_text(json.dumps(report,indent=2))
for cam in cams:render(cam,OUT/(cam.name.replace('CAM_','03-')+'.png'),1440,900)
print(json.dumps(report),flush=True)
