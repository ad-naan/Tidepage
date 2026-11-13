"""Pack the existing greeting GIF without changing any frame pixels or timing.

Asset tooling only: python scripts/build-otter-sprite.py (requires Pillow).
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
source = root / "public/assets/illustrations/hero-otter-wave.gif"
output = root / "public/assets/illustrations/hero-otter-wave-sprite.webp"
metadata = root / "src/modules/world/domain/hero-otter-animation.json"
review = root / "artifacts/reviews/web/illustration"
review.mkdir(parents=True, exist_ok=True)

with Image.open(source) as animation:
    frames, durations = [], []
    for index in range(animation.n_frames):
        animation.seek(index)
        frames.append(animation.convert("RGBA"))
        durations.append(animation.info["duration"])

width, height = frames[0].size
sprite = Image.new("RGBA", (width * len(frames), height))
for index, frame in enumerate(frames):
    sprite.paste(frame, (width * index, 0))
sprite.save(output, lossless=True, exact=True, method=6)

with Image.open(output) as decoded:
    for index, frame in enumerate(frames):
        cell = decoded.convert("RGBA").crop((width * index, 0, width * (index + 1), height))
        assert cell.tobytes() == frame.tobytes(), f"Frame {index} changed"

metadata.write_text(json.dumps({"width": width, "height": height, "durations": durations}, indent=2) + "\n", encoding="utf-8")
grid = Image.new("RGB", (width * 4, (height + 28) * 2), "#f8f7f2")
draw = ImageDraw.Draw(grid)
for index, frame in enumerate(frames):
    x, y = index % 4 * width, index // 4 * (height + 28)
    grid.paste(frame, (x, y), frame)
    draw.text((x + 12, y + height + 5), f"{index + 1}: {durations[index]} ms", fill="#343a36")
grid.save(review / "otter-frames.png")
report = {
    "source": str(source.relative_to(root)),
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "output": str(output.relative_to(root)),
    "output_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    "bytes": output.stat().st_size,
    "frames": len(frames),
    "durations_ms": durations,
    "total_ms": sum(durations),
    "all_frames_byte_identical": True,
    "errors": [],
}
(review / "otter-sprite.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
