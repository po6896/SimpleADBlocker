#!/usr/bin/env python3
"""
Insert a Sleipnir userscript (.slex.js) directly into Sleipnir Mobile's
slex.db, bypassing the gallery / login / UI entirely. Lets the Android
emulator test the *current* local slex with no manual steps.

slex.db schema (Sleipnir Mobile):
  elements(_id, gallery_id, origin UNIQUE, name, author, description,
           version, requires, icon BLOB, code, latest_version, latest_url, enabled)
  id_include(_id, element_id, pattern)
  id_exclude(_id, element_id, pattern)

Usage: install-slex.py <slex.js> <slex.db> [origin]
"""
import sqlite3
import sys
import re

slex_path, db_path = sys.argv[1], sys.argv[2]
origin = sys.argv[3] if len(sys.argv) > 3 else "local-sab"

src = open(slex_path, encoding="utf-8").read()


def meta(key):
    return [m.strip() for m in re.findall(r"^//\s*@" + key + r"\s+(.+?)\s*$", src, re.M)]


name = meta("name")[0]
author = meta("author")[0]
description = " ".join(meta("description"))
version = meta("version")[0]
includes = meta("include")
excludes = meta("exclude")
requires = meta("require")

con = sqlite3.connect(db_path)
cur = con.cursor()
cur.execute("DELETE FROM elements WHERE origin=?", (origin,))
cur.execute(
    """INSERT INTO elements
       (gallery_id, origin, name, author, description, version,
        requires, icon, code, latest_version, latest_url, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, 1)""",
    (origin, origin, name, author, description, version, "\n".join(requires), src),
)
eid = cur.lastrowid
for p in includes:
    cur.execute("INSERT OR IGNORE INTO id_include (element_id, pattern) VALUES (?, ?)", (eid, p))
for p in excludes:
    cur.execute("INSERT OR IGNORE INTO id_exclude (element_id, pattern) VALUES (?, ?)", (eid, p))
con.commit()

print(f"element_id={eid} name='{name}' version={version}")
print(f"includes={includes} excludes={excludes} requires={requires}")
print(f"code length={len(src)}")
con.close()
