"""Convert a Google Form into a questionnaire file for the SYNAPSE platform.

Input : the form definition (the FB_PUBLIC_LOAD_DATA_ array of the form's public 'viewform' page, saved as JSON),
        optionally a text file with one variable name per answerable item (in form order).
Output: questionnaire JSON (format described in README.md, section "Questionnaire files").

    python3 tools/google_form_to_questionnaire.py form.json --id my_form --names names.txt -o questionnaires/my_form.json

How to save the form definition: open the form's viewform URL, view the page source, copy the array assigned to
FB_PUBLIC_LOAD_DATA_ and save it as {"FB_PUBLIC_LOAD_DATA_": [...]} in form.json.
Only the Python standard library is needed.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

TYPES = {0: "text", 1: "text", 2: "single_choice", 3: "dropdown", 4: "checkboxes", 5: "scale"}
LAYOUT = (6, 8, 11, 12)          # section header, page break, image, video


def slug(text: str) -> str:
    s = re.sub(r"^\s*\d+[.)]\s*", "", text.lower())
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s[:40] or "item"


def convert(form: dict, qid: str, names: list[str] | None, skip: set[str]) -> dict:
    data = form["FB_PUBLIC_LOAD_DATA_"]
    title = data[3] if len(data) > 3 and isinstance(data[3], str) else qid
    intro = data[1][0] if data[1][0] else ""
    sections = [{"title": "", "description": "", "items": []}]
    k = 0
    used: set[str] = set()
    for it in data[1][1]:
        kind = it[3]
        text = (it[1] or "").strip()
        desc = (it[2] or "").strip() if len(it) > 2 and isinstance(it[2], str) else ""
        if kind in LAYOUT:
            if kind in (6, 8):
                sections.append({"title": text, "description": desc, "items": []})
            continue
        if not (len(it) > 4 and it[4]):
            continue
        sub = it[4][0]
        name = names[k] if names else slug(text)
        k += 1
        while name in used:
            name += "_"
        used.add(name)
        if name in skip:
            continue
        item = {"id": name, "text": text, "type": TYPES.get(kind, "text")}
        if desc:
            item["help"] = desc
        if kind == 5:                                      # linear scale: options are the scale points
            pts = [o[0] for o in (sub[1] or [])]
            item.update(type="single_choice", options=pts)
            if len(sub) > 3 and sub[3]:
                item["labels"] = [lab for lab in sub[3] if lab]
        elif len(sub) > 1 and sub[1]:
            item["options"] = [o[0] for o in sub[1]]
        item["required"] = bool(sub[2]) if len(sub) > 2 else False
        sections[-1]["items"].append(item)
    sections = [s for s in sections if s["items"] or s["description"]]
    return {"id": qid, "title": title, "description": intro, "source": "converted from a Google Form definition",
            "sections": sections}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("form", type=Path)
    ap.add_argument("--id", required=True, help="questionnaire id, e.g. T1_ieq")
    ap.add_argument("--title", help="title shown to participants (default: form title)")
    ap.add_argument("--names", type=Path, help="text file with one variable name per answerable item")
    ap.add_argument("--skip", default="", help="comma-separated variable names to leave out (e.g. items the app fills in)")
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    names = [n.strip() for n in a.names.read_text().splitlines() if n.strip()] if a.names else None
    q = convert(json.loads(a.form.read_text()), a.id, names, {s for s in a.skip.split(",") if s})
    if a.title:
        q["title"] = a.title
    a.out.write_text(json.dumps(q, indent=2, ensure_ascii=False) + "\n")
    print(f"{a.out}: {sum(len(s['items']) for s in q['sections'])} items in {len(q['sections'])} sections")


if __name__ == "__main__":
    main()
