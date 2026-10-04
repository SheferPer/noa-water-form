"""ממיר Markdown ל-HTML בעברית, לצורך הדפסה ל-PDF.

שימוש:  python tools/md2html.py MAPPING.md
        (נוצר MAPPING.html באותה תיקייה)
"""

import html
import io
import re
import sys
from pathlib import Path

STYLE = """<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title><style>
body{{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:28px 18px 60px;line-height:1.65;color:#0f1113;background:#fff}}
h1{{font-size:1.9rem;margin:0 0 6px}}
h2{{margin-top:2rem;padding:7px 13px;background:#0f1113;color:#fff;border-radius:9px;font-size:1.2rem}}
h3{{margin-top:1.4rem;color:#5b3fd6;font-size:1.02rem}}
p{{margin:.45rem 0}} p strong:first-child{{color:#0b7f73}}
table{{width:100%;border-collapse:collapse;margin:10px 0;font-size:.92rem;page-break-inside:auto}}
tr{{page-break-inside:avoid}}
th,td{{padding:7px 9px;border:1px solid #e3e5ec;text-align:right;vertical-align:top}}
th{{background:#f1ebff;font-weight:700}}
tbody tr:nth-child(even){{background:#fafbfd}}
code{{background:#fff6d9;padding:2px 5px;border-radius:4px}}
hr{{border:0;border-top:1px solid #c0c3cc;margin:1.6rem 0}}
ul{{padding-inline-start:22px}}
@page{{margin:14mm}}
</style></head><body>"""


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text.replace("\\|", "|").replace("\\*", "*")


def convert(md: str, title: str) -> str:
    out: list[str] = []
    rows: list[list[str]] = []
    in_list = False

    def flush_table() -> None:
        nonlocal rows
        if not rows:
            return
        head, body = rows[0], rows[2:]
        out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>")
        for row in body:
            out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>")
        out.append("</tbody></table>")
        rows = []

    for line in md.split("\n"):
        s = line.strip()
        if s.startswith("|"):
            rows.append([c.strip() for c in s.strip("|").split("|")])
            continue
        flush_table()
        if s.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{inline(s[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if s.startswith("### "):
            out.append(f"<h3>{inline(s[4:])}</h3>")
        elif s.startswith("## "):
            out.append(f"<h2>{inline(s[3:])}</h2>")
        elif s.startswith("# "):
            out.append(f"<h1>{inline(s[2:])}</h1>")
        elif s == "---":
            out.append("<hr>")
        elif s:
            out.append(f"<p>{inline(s)}</p>")
    flush_table()
    if in_list:
        out.append("</ul>")
    return STYLE.format(title=title) + "\n".join(out) + "</body></html>"


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        src = Path(arg)
        dest = src.with_suffix(".html")
        text = io.open(src, encoding="utf-8").read()
        first = next((l[2:].strip() for l in text.split("\n") if l.startswith("# ")), src.stem)
        io.open(dest, "w", encoding="utf-8").write(convert(text, first))
        print(f"{src.name} -> {dest.name}")
