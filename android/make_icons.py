"""Generates crisp adaptive & mipmap PNG launcher icons for agent Bot Android without external image libs."""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.abspath(__file__))


def write_png(path: str, size: int) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rows = []
    cx = cy = (size - 1) / 2.0
    r_max = size * 0.46
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = math.hypot(dx, dy)
            if dist > r_max:
                row.extend((0, 0, 0, 0))
                continue
            # Deep space gradient (#0ea5e9 -> #4f46e5)
            t = (x + y) / max(1.0, 2.0 * size)
            r = int(14 * (1 - t) + 79 * t)
            g = int(165 * (1 - t) + 70 * t)
            b = int(233 * (1 - t) + 229 * t)

            # Stylized lightning / bolt glyph in white
            nx = (x - size * 0.5) / (size * 0.5)
            ny = (y - size * 0.5) / (size * 0.5)
            in_upper = (-0.38 <= ny <= 0.04) and (-0.28 - ny * 0.55 <= nx <= 0.14 - ny * 0.45)
            in_lower = (-0.04 <= ny <= 0.38) and (-0.14 - ny * 0.45 <= nx <= 0.28 - ny * 0.55)
            if in_upper or in_lower:
                r, g, b = 248, 250, 252
            row.extend((r, g, b, 255))
        rows.append(bytes(row))

    raw = b"".join(rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


for folder, px in [
    ("mipmap-mdpi", 48),
    ("mipmap-hdpi", 72),
    ("mipmap-xhdpi", 96),
    ("mipmap-xxhdpi", 144),
    ("mipmap-xxxhdpi", 192),
]:
    write_png(os.path.join(ROOT, "res", folder, "ic_launcher.png"), px)

print("Generated launcher icons successfully.")
