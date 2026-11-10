#!/usr/bin/env python3
"""
Extractor y auditor sin dependencias externas (solo stdlib) para los informes
contractuales (.docx) del proyecto "Brillo en la montaña" (DEXIA - Univalle).

Modos de uso:
  1) Extraer texto, tablas, imágenes numeradas y firma de un informe previo:
     python inspect_docx.py "Informe mensual al supervisor 3.docx" --out-dir ./prev_sup

  2) Auditar numeración APA de figuras, referencias cruzadas, actividades,
     productos e higiene de identidades en un .docx nuevo:
     python inspect_docx.py "Informe mensual al supervisor 4.docx" --audit
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "v": "urn:schemas-microsoft-com:vml",
}

FORBIDDEN_PATTERNS = [
    (r"valentina\s+g[oó]mez", "Nombre ficticio no autorizado ('Valentina Gómez'); usa Danna Guerrero Vargas"),
    (r"localhost:\d+", "URL local visible en el texto del informe"),
    (r"\?dev=", "Parámetro sandbox '?dev=' visible en el texto del informe"),
]


def para_text(p: ET.Element) -> str:
    parts: list[str] = []
    for elem in p.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "t" and elem.text:
            parts.append(elem.text)
        elif tag == "tab":
            parts.append("\t")
        elif tag in ("br", "cr"):
            parts.append("\n")
    return "".join(parts).strip()


def extract_drawings_from_elem(elem: ET.Element) -> list[dict]:
    items: list[dict] = []
    for drawing in elem.findall(".//w:drawing", NS):
        is_anchor = drawing.find("wp:anchor", NS) is not None
        extent = drawing.find(".//wp:extent", NS)
        cx = int(extent.attrib.get("cx", "0")) if extent is not None else 0
        cy = int(extent.attrib.get("cy", "0")) if extent is not None else 0
        for blip in drawing.findall(".//a:blip", NS):
            rid = blip.attrib.get(f"{{{NS['r']}}}embed")
            if rid:
                items.append(
                    {
                        "rid": rid,
                        "is_anchor": is_anchor,
                        "cx_emu": cx,
                        "cy_emu": cy,
                        "xml": ET.tostring(drawing, encoding="unicode"),
                    }
                )
    for imagedata in elem.findall(".//v:imagedata", NS):
        rid = imagedata.attrib.get(f"{{{NS['r']}}}id")
        if rid:
            items.append(
                {
                    "rid": rid,
                    "is_anchor": True,
                    "cx_emu": 0,
                    "cy_emu": 0,
                    "xml": ET.tostring(imagedata, encoding="unicode"),
                }
            )
    return items


def parse_docx(docx_path: Path) -> dict:
    with zipfile.ZipFile(docx_path, "r") as zf:
        rels_xml = zf.read("word/_rels/document.xml.rels")
        doc_xml = zf.read("word/document.xml")

        rels_root = ET.fromstring(rels_xml)
        rels: dict[str, str] = {}
        for rel in rels_root:
            rid = rel.attrib.get("Id", "")
            target = rel.attrib.get("Target", "")
            if rid and target:
                rels[rid] = target.lstrip("/")

        doc_root = ET.fromstring(doc_xml)
        body = doc_root.find("w:body", NS)
        if body is None:
            raise RuntimeError("No se encontró w:body en word/document.xml")

        blocks: list[dict] = []
        all_images: list[dict] = []

        for idx, child in enumerate(list(body)):
            local = child.tag.split("}")[-1]
            if local == "p":
                txt = para_text(child)
                imgs = extract_drawings_from_elem(child)
                blocks.append({"index": idx, "type": "p", "text": txt, "images": imgs})
                for im in imgs:
                    all_images.append({**im, "block_index": idx, "near_text": txt})
            elif local == "tbl":
                rows_data: list[list[str]] = []
                imgs = extract_drawings_from_elem(child)
                for tr in child.findall("w:tr", NS):
                    row_cells: list[str] = []
                    for tc in tr.findall("w:tc", NS):
                        cell_lines = [para_text(p) for p in tc.findall(".//w:p", NS)]
                        cell_txt = "\n".join(l for l in cell_lines if l)
                        if not row_cells or cell_txt != row_cells[-1]:
                            row_cells.append(cell_txt)
                    if any(row_cells):
                        rows_data.append(row_cells)
                blocks.append({"index": idx, "type": "tbl", "rows": rows_data, "images": imgs})
                flat_txt = " | ".join(" / ".join(r) for r in rows_data)[:200]
                for im in imgs:
                    all_images.append({**im, "block_index": idx, "near_text": flat_txt})

        # Map each image to nearest Figura N caption or contractor signature
        non_empty_paras = [
            (b["index"], b["text"]) for b in blocks if b["type"] == "p" and b["text"]
        ]

        enriched_images: list[dict] = []
        signature_xml: str | None = None

        for order_idx, im in enumerate(all_images, start=1):
            b_idx = im["block_index"]
            rid = im["rid"]
            rel_target = rels.get(rid, "")
            zip_member = (
                rel_target
                if rel_target.startswith("word/")
                else f"word/{rel_target}".replace("word/../", "")
            )

            # Look around block_index for "Figura N", title, Nota., or "Fabian Stiven Valencia"
            window_before = [
                (i, t) for (i, t) in non_empty_paras if b_idx - 6 <= i <= b_idx
            ]
            window_after = [
                (i, t) for (i, t) in non_empty_paras if b_idx <= i <= b_idx + 6
            ]

            figura_label = None
            caption_title = None
            nota_text = None

            for p_i, p_t in reversed(window_before):
                if p_i < b_idx and (
                    p_t.startswith("Nota.")
                    or re.match(r"^(Actividad\s+espec[ií]fica|Producto\s+\d)", p_t, re.IGNORECASE)
                ):
                    break
                m = re.match(r"^Figura\s+(\d+)\b\s*(.*)$", p_t, flags=re.IGNORECASE)
                if m:
                    figura_label = f"Figura {m.group(1)}"
                    inline_rest = m.group(2).strip()
                    if inline_rest:
                        caption_title = inline_rest
                    else:
                        after_fig = [t for (j, t) in non_empty_paras if j > p_i]
                        if after_fig and not after_fig[0].startswith("Nota."):
                            caption_title = after_fig[0]
                    break

            for _, p_t in window_after:
                if p_t.startswith("Nota."):
                    nota_text = p_t
                    break

            nearby_joined = " ".join(t for _, t in (window_before + window_after))
            is_signature = bool(
                figura_label is None
                and re.search(r"Fabian\s+Stiven\s+Valencia", nearby_joined, re.IGNORECASE)
            )
            if is_signature and signature_xml is None:
                signature_xml = im["xml"]

            enriched_images.append(
                {
                    "appearance_order": order_idx,
                    "block_index": b_idx,
                    "rid": rid,
                    "zip_member": zip_member,
                    "is_anchor": im["is_anchor"],
                    "cx_emu": im["cx_emu"],
                    "cy_emu": im["cy_emu"],
                    "figura": figura_label,
                    "caption_title": caption_title,
                    "nota": nota_text,
                    "is_signature": is_signature,
                }
            )

        return {
            "docx_path": str(docx_path),
            "blocks": blocks,
            "images": enriched_images,
            "signature_xml": signature_xml,
        }


def export_docx_bundle(docx_path: Path, out_dir: Path) -> None:
    parsed = parse_docx(docx_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    media_dir = out_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    # Export Markdown dump
    md_lines: list[str] = [f"# Extracción de `{docx_path.name}`\n"]
    for b in parsed["blocks"]:
        if b["type"] == "p":
            if b["text"]:
                md_lines.append(b["text"])
                md_lines.append("")
            for _ in b["images"]:
                md_lines.append(f"<!-- [IMAGEN en bloque {b['index']}] -->\n")
        elif b["type"] == "tbl":
            md_lines.append(f"<!-- [TABLA en bloque {b['index']}] -->")
            for r_i, row in enumerate(b["rows"]):
                escaped = [c.replace("\n", " <br> ").replace("|", "\\|") for c in row]
                md_lines.append("| " + " | ".join(escaped) + " |")
                if r_i == 0:
                    md_lines.append("| " + " | ".join(["---"] * len(escaped)) + " |")
            md_lines.append("")

    (out_dir / "content.md").write_text("\n".join(md_lines), encoding="utf-8")

    # Export embedded images in appearance order
    with zipfile.ZipFile(docx_path, "r") as zf:
        names = set(zf.namelist())
        for im in parsed["images"]:
            member = im["zip_member"]
            if member in names:
                ext = Path(member).suffix or ".png"
                tag = (
                    im["figura"].lower().replace(" ", "_")
                    if im["figura"]
                    else ("firma" if im["is_signature"] else "img")
                )
                out_name = f"{im['appearance_order']:03d}_{tag}{ext}"
                (media_dir / out_name).write_bytes(zf.read(member))
                im["exported_file"] = f"media/{out_name}"
            else:
                im["exported_file"] = None

    if parsed["signature_xml"]:
        (out_dir / "signature_drawing.xml").write_text(
            parsed["signature_xml"], encoding="utf-8"
        )

    manifest = {
        "source_docx": str(docx_path),
        "total_blocks": len(parsed["blocks"]),
        "total_tables": sum(1 for b in parsed["blocks"] if b["type"] == "tbl"),
        "total_images": len(parsed["images"]),
        "has_signature_drawing": parsed["signature_xml"] is not None,
        "images": parsed["images"],
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"[OK] Extraído '{docx_path.name}' -> '{out_dir}' "
        f"({manifest['total_blocks']} bloques, {manifest['total_tables']} tablas, "
        f"{manifest['total_images']} imágenes, firma={manifest['has_signature_drawing']})."
    )


def audit_docx(docx_path: Path) -> int:
    parsed = parse_docx(docx_path)
    warnings: list[str] = []

    all_text_chunks: list[str] = []
    first_act1_block: int | None = None

    for b in parsed["blocks"]:
        if b["type"] == "p" and b["text"]:
            all_text_chunks.append(b["text"])
            if first_act1_block is None and re.search(
                r"Actividad\s+espec[ií]fica\s+No\.\s*1\b", b["text"], re.IGNORECASE
            ):
                first_act1_block = b["index"]
        elif b["type"] == "tbl":
            for row in b["rows"]:
                for cell in row:
                    all_text_chunks.append(cell)
                    if first_act1_block is None and re.search(
                        r"Actividad\s+espec[ií]fica\s+No\.\s*1\b", cell, re.IGNORECASE
                    ):
                        first_act1_block = b["index"]

    full_text = "\n".join(all_text_chunks)
    is_supervisor_report = bool(
        re.search(r"INFORME\s+MENSUAL\s+AL\s+SUPERVISOR", full_text, re.IGNORECASE)
    )

    # 1. Check Activities 1..10 and Products 1..4
    for n in range(1, 11):
        if not re.search(rf"Actividad\s+espec[ií]fica\s+No\.\s*{n}\b", full_text, re.IGNORECASE):
            warnings.append(f"Falta 'Actividad específica No. {n}'.")
    for p in range(1, 5):
        if not re.search(rf"Producto\s+{p}\b", full_text, re.IGNORECASE):
            warnings.append(f"Falta 'Producto {p}' (los 4 productos son obligatorios).")

    # 2. Check forbidden patterns
    for pattern, msg in FORBIDDEN_PATTERNS:
        if re.search(pattern, full_text, re.IGNORECASE):
            warnings.append(msg)

    # 3. Check stray images before Actividad específica No. 1
    if first_act1_block is not None:
        early_imgs = [
            im for im in parsed["images"] if im["block_index"] < first_act1_block
        ]
        if early_imgs:
            warnings.append(
                f"Hay {len(early_imgs)} imagen(es) incrustada(s) antes de 'Actividad específica No. 1' "
                f"(bloques {[im['block_index'] for im in early_imgs]})."
            )

    # 4. Supervisor report specific checks (APA figures + cross references + signature)
    if is_supervisor_report:
        caption_nums: list[int] = []
        body_lines_without_captions: list[str] = []

        for b in parsed["blocks"]:
            if b["type"] == "p" and b["text"]:
                m = re.match(r"^Figura\s+(\d+)\b", b["text"].strip())
                if m:
                    caption_nums.append(int(m.group(1)))
                else:
                    body_lines_without_captions.append(b["text"])

        expected = list(range(1, len(caption_nums) + 1))
        if caption_nums != expected:
            warnings.append(
                f"Numeración de figuras no es continua 1..{len(caption_nums)}: detectado {caption_nums[:15]}..."
            )

        referenced: set[int] = set()
        body_ref_text = "\n".join(body_lines_without_captions)
        for m in re.finditer(
            r"Figuras?\s+(\d+)\s*(?:a|al|-|–)\s*(\d+)", body_ref_text, re.IGNORECASE
        ):
            a, b_num = int(m.group(1)), int(m.group(2))
            if a <= b_num:
                referenced.update(range(a, b_num + 1))
        for m in re.finditer(
            r"Figuras?\s+((?:\d+\s*(?:,\s*|\s+y\s+))+\d+)", body_ref_text, re.IGNORECASE
        ):
            for num_str in re.findall(r"\d+", m.group(1)):
                referenced.add(int(num_str))
        for m in re.finditer(r"Figura\s+(\d+)\b", body_ref_text, re.IGNORECASE):
            referenced.add(int(m.group(1)))

        caption_set = set(caption_nums)
        unreferenced = sorted(caption_set - referenced)
        missing_targets = sorted(referenced - caption_set)
        if unreferenced:
            warnings.append(f"Figuras sin citar en el texto: {unreferenced}")
        if missing_targets:
            warnings.append(
                f"Citas '(ver Figura ...)' que apuntan a figuras inexistentes: {missing_targets}"
            )
        if not parsed["signature_xml"]:
            warnings.append(
                "No se detectó la imagen de firma junto a 'Fabian Stiven Valencia Cordoba' al cierre."
            )

    tipo = "Informe mensual al supervisor" if is_supervisor_report else "Informe de actividades (Cuota)"
    print(f"=== Auditoría: {docx_path.name} ({tipo}) ===")
    print(f"Imágenes totales: {len(parsed['images'])}")
    if not warnings:
        print("[OK] 0 advertencias. Estructura, actividades 1-10, productos 1-4 y figuras verificados.")
        return 0
    for w in warnings:
        print(f"[WARN] {w}")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Extractor y auditor de informes .docx")
    parser.add_argument("docx", type=Path, help="Ruta al archivo .docx")
    parser.add_argument("--out-dir", type=Path, help="Directorio donde extraer texto, manifest e imágenes")
    parser.add_argument("--audit", action="store_true", help="Ejecutar auditoría de calidad sobre el .docx")
    args = parser.parse_args()

    if not args.docx.exists():
        print(f"[ERROR] No existe el archivo: {args.docx}", file=sys.stderr)
        return 2

    rc = 0
    if args.out_dir:
        export_docx_bundle(args.docx, args.out_dir)
    if args.audit:
        rc = audit_docx(args.docx)
    if not args.out_dir and not args.audit:
        rc = audit_docx(args.docx)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
