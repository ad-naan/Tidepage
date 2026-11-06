"""Run installed Blender QA skills against the withdrawn baseline, without editing it.

blender --factory-startup -b artifacts/fantasy-harbor/tidal-sanctuary.blend
  --python scripts/review-harbor-baseline.py
"""
from pathlib import Path
import importlib.util
import json
import sys
import types
import bpy

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts/fantasy-harbor/review"
SKILLS = Path.home() / ".codex/skills"
OUT.mkdir(parents=True, exist_ok=True)

def load(name, source):
    spec = importlib.util.spec_from_file_location(name, str(source))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

sys.path.insert(0, str(SKILLS / "blender-core/scripts"))
environment = load("env_report", SKILLS / "blender-core/scripts/env_report.py").run()
(OUT / "blender-environment.json").write_text(json.dumps(environment, indent=2), encoding="utf-8")

sys.path.insert(0, str(SKILLS / "blender-asset-qa/scripts"))
qa = load("qa_check", SKILLS / "blender-asset-qa/scripts/qa_check.py")
review_path = SKILLS / "blender-asset-qa/scripts/review_shots.py"
review_source = review_path.read_text(encoding="utf-8")
adaptations = []
if not hasattr(bpy.context.scene.render.image_settings, "media_type"):
    # Upstream targets Blender 5.2. Preserve its installed source; adapt this one
    # optional image-format assignment only in this 4.5 inspection process.
    review_source = review_source.replace(
        '        r.image_settings.media_type = "IMAGE"',
        '        if hasattr(r.image_settings, "media_type"):\n            r.image_settings.media_type = "IMAGE"',
    )
    adaptations.append("Skipped Blender 5.2-only ImageFormatSettings.media_type on Blender 4.5")
review = types.ModuleType("harbor_review_shots")
review.__file__ = str(review_path)
exec(compile(review_source, str(review_path), "exec"), review.__dict__)

house = bpy.data.objects.get("harbor_house")
if house is None:
    raise RuntimeError("Expected baseline house hierarchy was not found")
house_meshes = [o.name for o in house.children_recursive if o.type == "MESH"]
print("QA_STAGE house geometry", len(house_meshes), flush=True)
house_result = qa.run(objects=house_meshes, profile="game", max_tris=150000)
(OUT / "baseline-house-geometry.json").write_text(json.dumps(house_result, indent=2), encoding="utf-8")

print("QA_STAGE house multi-angle material views", flush=True)
house_sheet = review.run(objects=house_meshes, out=str(OUT / "baseline-house-material.png"),
    views=["front", "right", "back", "three_quarter"], mode="material", res=512)

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "artifacts/coast-models/sea-traveler.glb"))
imported = set(bpy.data.objects) - before
avatar_meshes = [o.name for o in imported if o.type == "MESH"]
# Inspect a neutral pose rather than a random animated frame.
for obj in imported:
    if obj.animation_data:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = True
bpy.context.view_layer.update()
print("QA_STAGE character geometry", len(avatar_meshes), flush=True)
avatar_result = qa.run(objects=avatar_meshes, profile="game", max_tris=150000)
(OUT / "baseline-character-geometry.json").write_text(json.dumps(avatar_result, indent=2), encoding="utf-8")
avatar_sheet = review.run(objects=avatar_meshes, out=str(OUT / "baseline-character-material.png"),
    views=["front", "right", "back", "three_quarter"], mode="material", res=512)
summary = {
    "purpose": "Review of withdrawn assets, not approval of a replacement",
    "blender": bpy.app.version_string,
    "blender_mcp_available": False,
    "execution": "separate headless Blender process",
    "upstream_skill_targets": "EL4CTEO Blender 5.2+",
    "tested_compatibility_scope": "env_report, qa_check and review_shots with recorded adaptation only",
    "adaptations": adaptations,
    "baseline_source": "artifacts/fantasy-harbor/tidal-sanctuary.blend",
    "house": {"automatic_pass": house_result["pass"], "error_count": len(house_result["errors"]),
        "warning_count": len(house_result["warnings"]), "review_sheet": house_sheet["sheet"]},
    "character": {"automatic_pass": avatar_result["pass"], "error_count": len(avatar_result["errors"]),
        "warning_count": len(avatar_result["warnings"]), "review_sheet": avatar_sheet["sheet"]},
    "verdict": "NO-SHIP: visual review and repairs are required before any runtime replacement",
    "source_blend_modified": False,
}
(OUT / "baseline-review-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps({"review": str(OUT), "house_errors": len(house_result["errors"]),
    "character_errors": len(avatar_result["errors"]), "verdict": summary["verdict"]}), flush=True)
