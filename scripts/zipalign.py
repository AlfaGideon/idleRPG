#!/usr/bin/env python3
"""Minimal zipalign — 4-byte align STORED entries in an APK.

A fallback for environments without Android SDK's native `zipalign` (e.g. a
CI sandbox). Only local extra fields are padded; central-directory records and
the EOCD are copied verbatim with patched offsets, so all metadata is kept.

Usage: python3 scripts/zipalign.py input.apk output.apk [alignment]
"""
import struct
import sys
import zipfile

LOCAL = 0x04034B50
CENTRAL = 0x02014B50
EOCD = 0x06054B50
PAD_ID = 0xD935  # Android's own "alignment extra field" ID


def align(src: str, dst: str, alignment: int = 4) -> None:
    with open(src, "rb") as f:
        raw = f.read()
    zf = zipfile.ZipFile(src)

    eocd_pos = raw.rfind(struct.pack("<I", EOCD))
    if eocd_pos < 0:
        raise ValueError("EOCD not found")
    cd_orig = struct.unpack_from("<I", raw, eocd_pos + 16)[0]
    cd_size_orig = struct.unpack_from("<I", raw, eocd_pos + 12)[0]
    cd_entries = struct.unpack_from("<H", raw, eocd_pos + 10)[0]

    # Parse the original central directory records (name/extra/comment lengths).
    pos = cd_orig
    central_records = []
    for _ in range(cd_entries):
        if struct.unpack_from("<I", raw, pos)[0] != CENTRAL:
            raise ValueError("bad central directory")
        nlen, elen, clen = struct.unpack_from("<HHH", raw, pos + 28)
        total = 46 + nlen + elen + clen
        central_records.append(bytearray(raw[pos:pos + total]))
        pos += total
    if pos != cd_orig + cd_size_orig:
        raise ValueError("central directory size mismatch")

    out = bytearray()
    for info, record in zip(zf.infolist(), central_records):
        off = info.header_offset
        hdr = struct.unpack("<IHHHHHIIIHH", raw[off:off + 30])
        (sig, ver, flags, method, tm, dt, crc, csize, usize, nlen, elen) = hdr
        if sig != LOCAL:
            raise ValueError(f"bad local header at {off}")
        name = raw[off + 30:off + 30 + nlen]
        extra = bytearray(raw[off + 30 + nlen:off + 30 + nlen + elen])
        payload = raw[off + 30 + nlen + elen:off + 30 + nlen + elen + csize]

        if method == 0:  # STORED — pad to `alignment`
            base = len(out) + 30 + nlen + len(extra)
            pad = (-base) % alignment
            extra += struct.pack("<HH", PAD_ID, pad) + b"\x00" * pad

        local_off = len(out)
        out += struct.pack("<IHHHHHIIIHH", sig, ver, flags, method, tm, dt,
                           crc, csize, usize, nlen, len(extra))
        out += name + bytes(extra) + payload
        struct.pack_into("<I", record, 42, local_off)

    cd_offset = len(out)
    for record in central_records:
        out += record
    cd_size = len(out) - cd_offset

    comment_len = struct.unpack_from("<H", raw, eocd_pos + 20)[0]
    eocd = bytearray(raw[eocd_pos:eocd_pos + 22 + comment_len])
    struct.pack_into("<I", eocd, 12, cd_size)
    struct.pack_into("<I", eocd, 16, cd_offset)
    out += eocd

    with open(dst, "wb") as f:
        f.write(out)

    with zipfile.ZipFile(dst) as check:
        bad = check.testzip()
        if bad:
            raise ValueError(f"corrupt entry after aligning: {bad}")
        if len(check.infolist()) != cd_entries:
            raise ValueError("entry count changed")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    a = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    align(sys.argv[1], sys.argv[2], a)
    print(f"zipalign: {sys.argv[1]} -> {sys.argv[2]} ({a}-byte)")
