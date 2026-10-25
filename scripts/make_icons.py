#!/usr/bin/env python3
"""Generate the PWA icons without any third-party image library.

Draws simple vector primitives into an RGB buffer with 2x supersampling,
then writes standard PNG files (zlib + CRC32 chunks).
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


def hexc(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    def __init__(self, size):
        self.n = size
        self.buf = bytearray(size * size * 3)

    def _blend(self, x, y, color, alpha=1.0):
        if alpha <= 0 or x < 0 or y < 0 or x >= self.n or y >= self.n:
            return
        i = (y * self.n + x) * 3
        if alpha >= 1:
            self.buf[i], self.buf[i + 1], self.buf[i + 2] = color
        else:
            self.buf[i] = int(lerp(self.buf[i], color[0], alpha))
            self.buf[i + 1] = int(lerp(self.buf[i + 1], color[1], alpha))
            self.buf[i + 2] = int(lerp(self.buf[i + 2], color[2], alpha))

    def fill(self, fn):
        for y in range(self.n):
            for x in range(self.n):
                col = fn(x / self.n, y / self.n)
                if col:
                    self._blend(x, y, col[0], col[1] if len(col) > 1 else 1.0)

    def circle(self, cx, cy, r, color, inner_r=0, alpha=1.0):
        x0, x1 = int(cx - r - 1), int(cx + r + 2)
        y0, y1 = int(cy - r - 1), int(cy + r + 2)
        for y in range(max(0, y0), min(self.n, y1)):
            for x in range(max(0, x0), min(self.n, x1)):
                d = math.hypot(x + .5 - cx, y + .5 - cy)
                if inner_r < d <= r:
                    self._blend(x, y, color, alpha)

    def poly(self, pts, color, alpha=1.0):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, x1 = int(min(xs)), int(max(xs) + 1)
        y0, y1 = int(min(ys)), int(max(ys) + 1)
        edges = list(zip(pts, pts[1:] + pts[:1]))
        for y in range(max(0, y0), min(self.n, y1)):
            cy = y + .5
            crossings = []
            for (ax, ay), (bx, by) in edges:
                if (ay <= cy < by) or (by <= cy < ay):
                    crossings.append(ax + (cy - ay) * (bx - ax) / (by - ay))
            crossings.sort()
            for k in range(0, len(crossings) - 1, 2):
                xa, xb = crossings[k], crossings[k + 1]
                for x in range(max(0, int(xa)), min(self.n, int(xb + 1))):
                    self._blend(x, y, color, alpha)

    def line_poly(self, p1, p2, width, color):
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length * width / 2, dx / length * width / 2
        self.poly([(p1[0] + nx, p1[1] + ny), (p2[0] + nx, p2[1] + ny),
                   (p2[0] - nx, p2[1] - ny), (p1[0] - nx, p1[1] - ny)], color)

    def downsample(self, target):
        factor = self.n // target
        out = bytearray(target * target * 3)
        area = factor * factor
        for y in range(target):
            for x in range(target):
                r = g = b = 0
                for dy in range(factor):
                    row = ((y * factor + dy) * self.n + x * factor) * 3
                    for dx in range(factor):
                        i = row + dx * 3
                        r += self.buf[i]
                        g += self.buf[i + 1]
                        b += self.buf[i + 2]
                o = (y * target + x) * 3
                out[o], out[o + 1], out[o + 2] = r // area, g // area, b // area
        return out


def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)


def write_png(path, size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw.extend(pixels[y * size * 3:(y + 1) * size * 3])
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


GOLD = hexc("e9c46a")
GOLD_LIGHT = hexc("ffe9a8")
GOLD_DARK = hexc("9c6b1f")
CRIMSON = hexc("a12f36")
CRIMSON_DARK = hexc("5c171f")
STEEL = hexc("d8e2ea")
STEEL_DARK = hexc("7d8b9b")
NAVY = hexc("161c2e")
NAVY_DARK = hexc("0a0d18")


def sword(c, cx, cy, angle, scale):
    """A stylised sword pointing up, rotated by angle (radians)."""
    def T(x, y):
        x *= scale
        y *= scale
        return (cx + x * math.cos(angle) - y * math.sin(angle),
                cy + x * math.sin(angle) + y * math.cos(angle))
    # blade
    c.poly([T(-0.035, -0.34), T(0.035, -0.34), T(0.035, 0.10),
            T(0, 0.155), T(-0.035, 0.10)], STEEL)
    c.poly([T(-0.035, -0.34), T(-0.008, -0.34), T(-0.008, 0.10), T(-0.035, 0.10)], hexc("ffffff"))
    c.poly([T(-0.035, -0.34), T(0.035, -0.34), T(0, -0.40)], GOLD_LIGHT)
    # guard
    c.poly([T(-0.135, 0.10), T(0.135, 0.10), T(0.16, 0.15), T(-0.16, 0.15)], GOLD)
    c.circle(*T(0, 0.125), 0.026 * scale, CRIMSON)
    # grip
    c.poly([T(-0.025, 0.15), T(0.025, 0.15), T(0.025, 0.26), T(-0.025, 0.26)], hexc("5c3a1e"))
    c.circle(*T(0, 0.28), 0.04 * scale, GOLD)


def shield(c, s, scale):
    cx, cy = s / 2, s / 2 + s * 0.03
    def P(x, y):
        return (cx + x * scale, cy + y * scale)
    outer = [P(-0.31, -0.30), P(0.31, -0.30), P(0.31, 0.08),
             P(0.25, 0.26), P(0, 0.44), P(-0.25, 0.26), P(-0.31, 0.08)]
    inner = [P(-0.265, -0.245), P(0.265, -0.245), P(0.265, 0.06),
             P(0.21, 0.22), P(0, 0.375), P(-0.21, 0.22), P(-0.265, 0.06)]
    c.poly(outer, GOLD_DARK)
    c.poly(inner, CRIMSON)
    # diagonal sheen
    c.poly([P(-0.265, -0.245), P(-0.05, -0.245), P(-0.24, 0.15), P(-0.265, 0.06)], hexc("c04a4c"))
    # crown on the shield
    crown = [P(-0.17, -0.075), P(-0.175, -0.19), P(-0.085, -0.12),
             P(0, -0.22), P(0.085, -0.12), P(0.175, -0.19),
             P(0.17, -0.075)]
    c.poly(crown, GOLD)
    c.poly([P(-0.17, -0.045), P(0.17, -0.045), P(0.17, -0.005), P(-0.17, -0.005)], GOLD_LIGHT)
    for gx, gy, col in [(-0.175, -0.19, hexc("5bc0eb")), (0, -0.22, CRIMSON_DARK),
                        (0.175, -0.19, hexc("5bc0eb")), (0, -0.035, hexc("3aa06a"))]:
        c.circle(*P(gx, gy), 0.028 * scale, col)


def render(size, maskable=False):
    ss = size * 2
    c = Canvas(ss)

    # background: deep navy vignette with a warm radial glow
    def bg(u, v):
        d = math.hypot(u - .5, v - .44)
        base = mix(NAVY, NAVY_DARK, min(1, d * 1.5))
        glow = max(0, 1 - d * 2.0)
        return (mix(base, hexc("3a2d22"), glow * 0.55),)
    c.fill(bg)

    # gold ring
    c.circle(ss / 2, ss * .47, ss * .415, GOLD_DARK, inner_r=ss * .398)
    c.circle(ss / 2, ss * .47, ss * .395, hexc("252c42"), inner_r=ss * .385)

    scale = ss * (0.74 if maskable else 0.86)
    shield(c, ss, scale)

    return c.downsample(size)


for name, size, maskable in [("icon-192.png", 192, False),
                             ("icon-512.png", 512, False),
                             ("icon-maskable.png", 512, True)]:
    write_png(os.path.join(OUT, name), size, render(size, maskable))
    print("wrote", name)
