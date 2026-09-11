"""Descarga una sola vez los reveal que la auditoría de Memoria marca como ausentes."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import sys
import urllib.parse
import urllib.request
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
MAPPING = ROOT / "tmp" / "memory-vintage-mapping.csv"
OUTPUT_DIR = ROOT / "juegos" / "vintage-cards" / "reveal"
LOG_FILE = ROOT / "tmp" / "memory-vintage-downloads.json"
MAX_DIMENSION = 1600
TARGET_MAX_BYTES = 150_000
QUALITY_STEPS = (88, 86, 84, 82, 80, 78, 76)


def ascii_without_accents(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value)
        if unicodedata.category(character) != "Mn"
    )


def download_url(candidate: str) -> tuple[bytes, str, str]:
    split_url = urllib.parse.urlsplit(candidate)
    encoded_url = urllib.parse.urlunsplit(
        (split_url.scheme, split_url.netloc, urllib.parse.quote(split_url.path), split_url.query, split_url.fragment)
    )
    request = urllib.request.Request(
        encoded_url,
        headers={"User-Agent": "Patxanguilles one-time vintage asset migration/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read(), response.headers.get_content_type(), encoded_url


def download_source(source_url: str, wp_post_id: str) -> tuple[bytes, str, str, str]:
    candidates = []
    for candidate in (
        source_url,
        unicodedata.normalize("NFC", source_url),
        unicodedata.normalize("NFD", source_url),
        ascii_without_accents(source_url),
    ):
        if candidate not in candidates:
            candidates.append(candidate)

    errors = []
    for candidate in candidates:
        try:
            data, content_type, resolved = download_url(candidate)
            return data, content_type, resolved, "source_image_url"
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    if wp_post_id:
        api_url = f"https://odioeternoalfutbolmoderno.es/wp-json/wp/v2/posts/{wp_post_id}?_embed=1"
        try:
            raw, _, _ = download_url(api_url)
            post = json.loads(raw)
            candidates = []
            media = (post.get("_embedded", {}).get("wp:featuredmedia") or [{}])[0]
            candidates.append(media.get("source_url"))
            candidates.extend(
                size.get("source_url")
                for size in media.get("media_details", {}).get("sizes", {}).values()
            )
            html = post.get("content", {}).get("rendered", "")
            candidates.extend(re.findall(r'<img[^>]+src=["\']([^"\']+)', html, re.I))
            for candidate in [value for value in candidates if value]:
                try:
                    data, content_type, resolved = download_url(candidate)
                    if content_type.startswith("image/"):
                        return data, content_type, resolved, "wordpress_post_resolution"
                except Exception as exc:
                    errors.append(f"{candidate}: {exc}")
        except Exception as exc:
            errors.append(f"{api_url}: {exc}")
    raise RuntimeError("No se pudo resolver la imagen de origen: " + " | ".join(errors))


def encode_jpeg(image: Image.Image) -> tuple[bytes, int]:
    if image.mode not in ("RGB", "L"):
        background = Image.new("RGB", image.size, "white")
        if "A" in image.getbands():
            background.paste(image, mask=image.getchannel("A"))
        else:
            background.paste(image.convert("RGB"))
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    if max(image.size) > MAX_DIMENSION:
        image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

    chosen = b""
    chosen_quality = QUALITY_STEPS[-1]
    for quality in QUALITY_STEPS:
        output = io.BytesIO()
        image.save(
            output,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
            subsampling="4:2:0",
        )
        chosen = output.getvalue()
        chosen_quality = quality
        if len(chosen) <= TARGET_MAX_BYTES:
            break
    return chosen, chosen_quality


def main() -> int:
    if not MAPPING.exists():
        raise RuntimeError("Ejecuta primero tools/audit-memory-vintage-assets.mjs")

    with MAPPING.open(encoding="utf-8-sig", newline="") as handle:
        missing = [row for row in csv.DictReader(handle) if row["found"] == "false"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    failures: list[dict[str, str]] = []
    for index, row in enumerate(missing, 1):
        destination = OUTPUT_DIR / row["expected_file"]
        if destination.exists():
            raise RuntimeError(f"No se sobrescribe el archivo ya existente: {destination.name}")
        source_url = row["source_image_url"]
        if not source_url:
            raise RuntimeError(f"{row['id']} no tiene source_image_url")

        try:
            source_bytes, content_type, resolved_source_url, resolution_method = download_source(source_url, row["wp_post_id"])
        except Exception as exc:
            failures.append({
                "id": row["id"],
                "slug": row["slug"],
                "player_name": row["player_name"],
                "source_url": source_url,
                "error": str(exc),
            })
            print(f"[{index}/{len(missing)}] FALLO {destination.name}: {exc}", file=sys.stderr)
            continue
        if not source_bytes:
            raise RuntimeError(f"Descarga vacía para {row['id']}")

        with Image.open(io.BytesIO(source_bytes)) as opened:
            opened.verify()
        with Image.open(io.BytesIO(source_bytes)) as opened:
            image = ImageOps.exif_transpose(opened)
            image.load()
            original_format = opened.format
            original_size = image.size
            encoded, quality = encode_jpeg(image)
        with Image.open(io.BytesIO(encoded)) as verification:
            verification.verify()

        destination.write_bytes(encoded)
        result = {
            "id": row["id"],
            "slug": row["slug"],
            "player_name": row["player_name"],
            "source_url": source_url,
            "resolved_source_url": resolved_source_url,
            "resolution_method": resolution_method,
            "source_content_type": content_type,
            "source_format": original_format,
            "source_bytes": len(source_bytes),
            "source_dimensions": list(original_size),
            "destination": destination.relative_to(ROOT).as_posix(),
            "jpeg_quality": quality,
            "final_bytes": len(encoded),
            "sha256": hashlib.sha256(encoded).hexdigest(),
        }
        results.append(result)
        print(f"[{index}/{len(missing)}] {destination.name}: {len(encoded)} bytes (Q{quality})")

    LOG_FILE.write_text(json.dumps({"downloaded": results, "failures": failures}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Migradas {len(results)} imágenes; fallos: {len(failures)}. Log: {LOG_FILE.relative_to(ROOT)}")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
