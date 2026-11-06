"""Run installed asset QA unchanged; persist actual findings before any export."""
import sys,json,importlib.util
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/fantasy-harbor/rebuild'
skills=Path.home()/'.codex/skills';sys.path.insert(0,str(skills/'blender-core/scripts'));sys.path.insert(0,str(skills/'blender-asset-qa/scripts'))
spec=importlib.util.spec_from_file_location('qa_check',skills/'blender-asset-qa/scripts/qa_check.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
is_character='cartoon' in bpy.data.filepath
objects=[o for o in bpy.data.objects if o.type=='MESH' and any(c.name=='COL_Traveler' for c in o.users_collection)] if is_character else [o for o in bpy.data.objects if o.type=='MESH' and not any(c.name=='COL_Review' for c in o.users_collection)]
name='05-cartoon-qa' if is_character else '05-bay-qa'
print('QA_CHECK',name,len(objects),flush=True)
result=qa.run(objects=[o.name for o in objects],profile='game',eps=.0003,tol=.004,max_tris=300000)
(OUT/(name+'.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'report':name,'pass':result['pass'],'errors':result['errors'][:30],'warnings_count':len(result['warnings'])}),flush=True)
