"""
Extract ad-heavy corpus candidates from Brave browsing history.

- Brave's History DB is SQLite, locked while the browser is running.
  We copy it to a temp file before reading.
- Rank candidates by (visit_count, hueristic ad-heavy score).
- Emit a YAML-friendly shortlist for manual review.
"""
from __future__ import annotations
import os
import re
import shutil
import sqlite3
import sys
import tempfile
from collections import defaultdict
from urllib.parse import urlparse

BRAVE_HISTORY = os.path.expandvars(
    r"C:\Users\codho\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\History"
)

# Domains that never make sense in an ad-blocker corpus.
BLACKLIST_SUBSTR = [
    "localhost",
    "127.0.0.1",
    "google.com/search",
    "www.google.com",
    "chrome://",
    "brave://",
    "mail.", "gmail.", "messenger.", "notion.so", "figma.com",
    "slack.com", "discord.com",
    "github.com",         # dev, not ad-heavy
    "claude.ai", "chatgpt.com", "openai.com", "anthropic.com",
    "youtube.com",        # real device test, DOM is SPA
    "twitter.com", "x.com",
    "instagram.com", "tiktok.com",
    "booth.pm",           # own seller
    "fenrir-inc.com",     # Sleipnir self
    "localhost", "0.0.0.0",
]

# Keywords that hint the page is ad-heavy.
# Weighted - higher means more likely ad-heavy.
AD_HEAVY_HINTS = {
    # JP matome / blog networks
    "livedoor.jp": 4, "blog.jp": 3, "ameblo.jp": 3, "fc2.com": 3,
    "hatenablog": 2, "seesaa": 3, "goo.ne.jp": 2, "ldblog": 4,
    # news portals (heavy SSP)
    "news.yahoo": 3, "mainichi.jp": 2, "asahi.com": 2, "yomiuri.co.jp": 2,
    "sankei.com": 2, "nikkansports.com": 2, "sponichi.co.jp": 2,
    # matome / 2ch style
    "2ch": 3, "5ch": 3, "matome": 3, "naver.jp": 3, "itest.5ch": 3,
    "hamusoku": 4, "jin115": 4, "yaraon": 4, "alfalfalfa": 4,
    "hatima": 3, "aribtr": 3, "dqnplus": 4,
    # game strategy wikis (heavy ads)
    "gamewith.jp": 3, "game8.jp": 3, "appmedia": 3, "altema.jp": 3,
    "atwiki": 3, "wikiwiki.jp": 3,
    # manga raw / reader
    "comic": 2, "manga": 2,
    # adult / affiliate
    "dlsite": 2,
    # antena aggregators
    "antena": 4, "antenna": 2,
}


def score_domain(hostname: str, path: str) -> int:
    s = 0
    h = hostname.lower()
    p = path.lower()
    for k, w in AD_HEAVY_HINTS.items():
        if k in h or k in p:
            s += w
    return s


def is_blacklisted(url: str) -> bool:
    u = url.lower()
    for bl in BLACKLIST_SUBSTR:
        if bl in u:
            return True
    return False


def main():
    if not os.path.exists(BRAVE_HISTORY):
        print(f"Brave History not found: {BRAVE_HISTORY}", file=sys.stderr)
        sys.exit(1)

    # Copy DB because Brave locks it while running.
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tmp:
        tmp_path = tmp.name
    shutil.copy2(BRAVE_HISTORY, tmp_path)

    try:
        con = sqlite3.connect(tmp_path)
        con.row_factory = sqlite3.Row
        cur = con.execute(
            """
            SELECT url, title, visit_count, last_visit_time
            FROM urls
            WHERE visit_count >= 2
              AND hidden = 0
            ORDER BY visit_count DESC
            LIMIT 5000
            """
        )
        rows = cur.fetchall()
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    # Aggregate to the origin (scheme + host) so we rank sites not pages.
    by_origin: dict[str, dict] = defaultdict(
        lambda: {"visits": 0, "top_url": "", "top_visits": 0, "title": "", "score": 0}
    )
    for r in rows:
        url = r["url"]
        if is_blacklisted(url):
            continue
        try:
            u = urlparse(url)
        except Exception:
            continue
        if u.scheme not in ("http", "https"):
            continue
        if not u.hostname:
            continue
        origin = f"{u.scheme}://{u.hostname}/"
        rec = by_origin[origin]
        rec["visits"] += r["visit_count"]
        rec["score"] = max(rec["score"], score_domain(u.hostname, u.path))
        if r["visit_count"] > rec["top_visits"]:
            rec["top_visits"] = r["visit_count"]
            rec["top_url"] = url
            rec["title"] = (r["title"] or "").strip()

    # Rank by score DESC, then visits DESC.
    ranked = sorted(
        by_origin.items(),
        key=lambda kv: (kv[1]["score"], kv[1]["visits"]),
        reverse=True,
    )

    lines = []
    lines.append(f"# Corpus candidates from Brave history ({len(ranked)} origins)\n")
    lines.append("| score | visits | origin | title | top_url |")
    lines.append("|---|---|---|---|---|")
    for origin, rec in ranked[:80]:
        if rec["score"] == 0 and rec["visits"] < 20:
            continue
        title = rec["title"][:40].replace("|", "/")
        top = rec["top_url"][:80].replace("|", "/")
        lines.append(f"| {rec['score']} | {rec['visits']} | {origin} | {title} | {top} |")

    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "test",
        "corpus",
        "candidates.md",
    )
    out_path = os.path.normpath(out_path)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {out_path} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
