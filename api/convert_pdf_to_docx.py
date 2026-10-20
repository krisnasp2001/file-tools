import sys
import os
import argparse
from pdf2docx import Converter
import docx
from docx.oxml.ns import qn


def post_process_docx(docx_path: str):
    """
    Post-process the converted DOCX document to achieve high visual fidelity:
    1. Sets explicit landscape orientation on sections where page width > height.
    2. Keeps exact row heights and adds cantSplit so Word doesn't split tables or expand rows.
    3. Zeroes out table cell margins to prevent row bloat and vertical spillover.
    4. Removes masking shading on large background cells that cover background photos.
    5. Strips empty trailing spacer paragraphs before section breaks and minimizes section break containers.
    6. Dynamically compresses vertical spacing in tight sections so content never overflows onto blank pages.
    """
    try:
        doc = docx.Document(docx_path)
        body = doc._body._element

        # --- 1. Set explicit landscape orientation on wide pages ---
        for s in doc.sections:
            sectPr = s._sectPr
            pgSz = sectPr.find(qn("w:pgSz"))
            if pgSz is not None:
                w = int(pgSz.get(qn("w:w"), 0))
                h = int(pgSz.get(qn("w:h"), 0))
                if w > h:
                    pgSz.set(qn("w:orient"), "landscape")
                    s.orientation = docx.enum.section.WD_ORIENT.LANDSCAPE

        # --- 2. Table row heights, cantSplit, and cell padding ---
        for table in doc.tables:
            tblPr = table._tbl.tblPr
            tblCellMar = tblPr.find(qn("w:tblCellMar"))
            if tblCellMar is None:
                tblCellMar = docx.oxml.OxmlElement("w:tblCellMar")
                tblPr.append(tblCellMar)
            for side in ("top", "bottom"):
                node = tblCellMar.find(qn(f"w:{side}"))
                if node is None:
                    node = docx.oxml.OxmlElement(f"w:{side}")
                    tblCellMar.append(node)
                node.set(qn("w:w"), "0")
                node.set(qn("w:type"), "dxa")

            for row in table.rows:
                trPr = row._tr.find(qn("w:trPr"))
                if trPr is None:
                    trPr = docx.oxml.OxmlElement("w:trPr")
                    row._tr.insert(0, trPr)

                if trPr.find(qn("w:cantSplit")) is None:
                    trPr.append(docx.oxml.OxmlElement("w:cantSplit"))

                # Keep row height exact
                trHeight = trPr.find(qn("w:trHeight"))
                if trHeight is not None:
                    trHeight.set(qn("w:hRule"), "exact")

                # Remove masking shading on huge dark background cells that cover photos
                val = int(trHeight.get(qn("w:val"), 0)) / 20.0 if trHeight is not None else 0
                if val > 80:
                    for cell in row.cells:
                        tcPr = cell._tc.find(qn("w:tcPr"))
                        if tcPr is not None:
                            shd = tcPr.find(qn("w:shd"))
                            if shd is not None:
                                fill = shd.get(qn("w:fill"), "").lower()
                                if fill in ("313131", "333332", "000000", "1a1a1a", "222222"):
                                    tcPr.remove(shd)

        # --- 3. Clean up trailing spacer paragraphs before section breaks ---
        def is_empty_p(p_elem):
            text = "".join(p_elem.itertext()).strip()
            drawings = len(p_elem.findall(".//" + qn("w:drawing")))
            return not text and drawings == 0

        def minimize_p(p_elem):
            pPr = p_elem.find(qn("w:pPr"))
            if pPr is None:
                pPr = docx.oxml.OxmlElement("w:pPr")
                p_elem.insert(0, pPr)

            spacing = pPr.find(qn("w:spacing"))
            if spacing is None:
                spacing = docx.oxml.OxmlElement("w:spacing")
                pPr.append(spacing)
            spacing.set(qn("w:before"), "0")
            spacing.set(qn("w:after"), "0")
            spacing.set(qn("w:line"), "20")
            spacing.set(qn("w:lineRule"), "exact")

            rPr = p_elem.find(qn("w:rPr"))
            if rPr is None:
                rPr = docx.oxml.OxmlElement("w:rPr")
                p_elem.insert(0, rPr)
            sz = rPr.find(qn("w:sz"))
            if sz is None:
                sz = docx.oxml.OxmlElement("w:sz")
                rPr.append(sz)
            sz.set(qn("w:val"), "2")

        children = list(body)
        to_remove = []

        for i, child in enumerate(children):
            tag = child.tag.split("}")[-1]
            if tag == "p":
                pPr = child.find(qn("w:pPr"))
                has_sectPr = pPr is not None and pPr.find(qn("w:sectPr")) is not None
                if has_sectPr:
                    minimize_p(child)
                    j = i - 1
                    while j >= 0:
                        prev = children[j]
                        ptag = prev.tag.split("}")[-1]
                        if ptag == "p" and is_empty_p(prev):
                            prev_pPr = prev.find(qn("w:pPr"))
                            prev_has_sect = prev_pPr is not None and prev_pPr.find(qn("w:sectPr")) is not None
                            if not prev_has_sect:
                                to_remove.append(prev)
                        else:
                            break
                        j -= 1

        # Also clean up trailing empty paragraphs before final sectPr
        j = len(children) - 1
        while j >= 0:
            prev = children[j]
            ptag = prev.tag.split("}")[-1]
            if ptag == "sectPr":
                pass
            elif ptag == "p" and is_empty_p(prev):
                prev_pPr = prev.find(qn("w:pPr"))
                prev_has_sect = prev_pPr is not None and prev_pPr.find(qn("w:sectPr")) is not None
                if not prev_has_sect:
                    to_remove.append(prev)
            else:
                break
            j -= 1

        for el in to_remove:
            try:
                body.remove(el)
            except ValueError:
                pass

        # --- 4. Dynamically compress vertical spacing in tight sections ---
        sections_elements = []
        curr = []
        for child in list(body):
            tag = child.tag.split("}")[-1]
            curr.append(child)
            pPr = child.find(qn("w:pPr")) if tag == "p" else None
            sectPr = pPr.find(qn("w:sectPr")) if pPr is not None else (child if tag == "sectPr" else None)
            if sectPr is not None:
                sections_elements.append((curr, sectPr))
                curr = []

        for elems, sectPr in sections_elements:
            pgSz = sectPr.find(qn("w:pgSz"))
            page_h = int(pgSz.get(qn("w:h"), 11906)) / 20.0 if pgSz is not None else 595.0

            pgMar = sectPr.find(qn("w:pgMar"))
            top_m = int(pgMar.get(qn("w:top"), 0)) / 20.0 if pgMar is not None else 0
            bot_m = int(pgMar.get(qn("w:bottom"), 0)) / 20.0 if pgMar is not None else 0
            usable_h = page_h - top_m - bot_m

            total_h = 0
            spacings = []
            for item in elems:
                itag = item.tag.split("}")[-1]
                if itag == "tbl":
                    for r in item.findall(qn("w:tr")):
                        trPr = r.find(qn("w:trPr"))
                        if trPr is not None:
                            trH = trPr.find(qn("w:trHeight"))
                            if trH is not None:
                                total_h += int(trH.get(qn("w:val"), 0)) / 20.0
                elif itag == "p":
                    pPr = item.find(qn("w:pPr"))
                    if pPr is not None:
                        sp = pPr.find(qn("w:spacing"))
                        if sp is not None:
                            bef = int(sp.get(qn("w:before"), 0)) / 20.0
                            aft = int(sp.get(qn("w:after"), 0)) / 20.0
                            line = int(sp.get(qn("w:line"), 240)) / 20.0
                            total_h += bef + aft + line
                            if bef > 5 or aft > 5:
                                spacings.append((sp, bef, aft))
                        else:
                            total_h += 12.0
                    else:
                        total_h += 12.0

            # If total_h exceeds or comes within 10pt of usable_h, scale down spacing
            if total_h > usable_h - 10 and spacings:
                overflow = total_h - (usable_h - 15)
                total_flex = sum(bef + aft for _, bef, aft in spacings)
                if total_flex > 0:
                    scale = max(0.2, (total_flex - overflow) / total_flex)
                    for sp, bef, aft in spacings:
                        new_bef = int(bef * scale * 20)
                        new_aft = int(aft * scale * 20)
                        sp.set(qn("w:before"), str(new_bef))
                        sp.set(qn("w:after"), str(new_aft))

        doc.save(docx_path)
    except Exception as e:
        print(f"Warning: post-processing layout adjustments skipped: {e}", file=sys.stderr)


def convert(input_path: str, output_path: str):
    if not os.path.exists(input_path):
        print(f"Error: input file {input_path} not found", file=sys.stderr)
        sys.exit(1)

    cv = Converter(input_path)
    try:
        cv.convert(output_path, start=0, end=None)
    finally:
        cv.close()

    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        post_process_docx(output_path)
        print(f"Successfully converted and cleaned DOCX at {output_path}")
        return output_path
    else:
        raise RuntimeError("Conversion failed to produce output file")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PDF to high-fidelity DOCX")
    parser.add_argument("input", help="Path to input PDF file")
    parser.add_argument("output", help="Path to output DOCX file")
    args = parser.parse_args()

    convert(args.input, args.output)
