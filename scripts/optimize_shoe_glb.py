"""Resize the embedded shoe textures while preserving the original GLB mesh."""

from __future__ import annotations

import io
import json
import shutil
import struct
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "public" / "assets" / "models" / "running-shoe.glb"
BACKUP = ROOT / "source-assets" / "running-shoe.original.glb"
MAX_TEXTURE_EDGE = 1024


def align_four(data: bytes, padding: bytes = b"\0") -> bytes:
    return data + padding * ((-len(data)) % 4)


def read_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    magic, version, _ = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2:
        raise ValueError("Only binary GLB 2.0 files are supported")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise ValueError("GLB JSON chunk is missing")
    json_start = 20
    document = json.loads(raw[json_start : json_start + json_length])
    bin_header = json_start + json_length
    bin_length, bin_type = struct.unpack_from("<II", raw, bin_header)
    if bin_type != 0x004E4942:
        raise ValueError("GLB binary chunk is missing")
    binary = raw[bin_header + 8 : bin_header + 8 + bin_length]
    return document, binary


def resize_jpeg(payload: bytes) -> tuple[bytes, tuple[int, int], tuple[int, int]]:
    with Image.open(io.BytesIO(payload)) as image:
        original_size = image.size
        image.thumbnail((MAX_TEXTURE_EDGE, MAX_TEXTURE_EDGE), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.convert("RGB").save(output, "JPEG", quality=88, optimize=True, progressive=True)
        return output.getvalue(), original_size, image.size


def optimize() -> None:
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if not BACKUP.exists():
        shutil.copy2(MODEL, BACKUP)

    document, binary = read_glb(BACKUP)
    image_views = {
        image["bufferView"]
        for image in document.get("images", [])
        if image.get("mimeType") == "image/jpeg" and "bufferView" in image
    }
    rebuilt = bytearray()
    report = []

    for index, view in sorted(enumerate(document["bufferViews"]), key=lambda item: item[1].get("byteOffset", 0)):
        start = view.get("byteOffset", 0)
        payload = binary[start : start + view["byteLength"]]
        if index in image_views:
            payload, before, after = resize_jpeg(payload)
            report.append((index, before, after, view["byteLength"], len(payload)))
        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(payload)
        rebuilt.extend(payload)

    rebuilt_bytes = align_four(bytes(rebuilt))
    document["buffers"][0]["byteLength"] = len(rebuilt_bytes)
    json_bytes = align_four(json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), b" ")
    total_length = 12 + 8 + len(json_bytes) + 8 + len(rebuilt_bytes)
    output = bytearray(struct.pack("<4sII", b"glTF", 2, total_length))
    output.extend(struct.pack("<II", len(json_bytes), 0x4E4F534A))
    output.extend(json_bytes)
    output.extend(struct.pack("<II", len(rebuilt_bytes), 0x004E4942))
    output.extend(rebuilt_bytes)
    MODEL.write_bytes(output)

    print(f"GLB: {BACKUP.stat().st_size:,} -> {MODEL.stat().st_size:,} bytes")
    for index, before, after, old_bytes, new_bytes in report:
        print(f"image {index}: {before[0]}x{before[1]} -> {after[0]}x{after[1]}, {old_bytes:,} -> {new_bytes:,} bytes")


if __name__ == "__main__":
    optimize()
