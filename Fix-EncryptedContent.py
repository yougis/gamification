#!/usr/bin/env python3
"""Fix-EncryptedContent UNIVERSAL v1 - one file for Windows, Linux, macOS.

Fixes ALL local opencode sessions hit by:
  Error from provider (Console): Upstream request failed: [invalid_request_error]
  reasoning `encrypted_content` was not issued to this caller

Usage - close opencode first, then run:
  Windows:       double-click this file,  or:  py Fix-EncryptedContent.py
  Linux / macOS: python3 Fix-EncryptedContent.py
Options:
  --dir PATH   clean only this data dir (or opencode.db file)
  --backup     copy opencode.db (+wal/shm) to a backup folder first (off = no junk)
  --force      skip the "opencode is running" check (use on a COPY of the data dir)
  --no-pause   do not wait for ENTER at the end (for terminals / scripts)

What it does: finds EVERY local opencode data dir (`opencode db path` first,
then known locations per OS) and removes ONLY stale caller-bound reasoning
blobs (reasoningEncryptedContent / itemId / signature inside reasoning and
metadata nodes). Messages, text, tool calls, results, files and todos are
kept verbatim. Creates NO extra files by default (no backups, no logs).

Stdlib only. Python 3.8+.
"""

import argparse
import json
import os
import platform
import re
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime

VERSION = "universal-v1"

SIG_KEY_RE = re.compile(r"signature|encrypted|item_?id|reasoning.?encrypted", re.IGNORECASE)
THINK_TYPES = {"reasoning", "thinking", "redacted_thinking", "reasoning_content"}
META_KEYS = {"metadata", "providermetadata", "provideroptions"}
KEEP_KEYS = {"id", "messageid", "message_id", "sessionid", "session_id",
             "callid", "call_id", "toolcallid", "tool_call_id", "text",
             "thinking", "time", "type", "tool", "input", "output"}
PREFILTER_WORDS = ("reasoning", "thinking", "redacted", "signature",
                   "encrypted_content", "encryptedcontent", "providermetadata")
FILE_STORE_SUBDIRS = (
    os.path.join("storage", "part"),
    os.path.join("storage", "parts"),
    os.path.join("storage", "message"),
    os.path.join("storage", "messages"),
    os.path.join("storage", "session"),
    os.path.join("storage", "sessions"),
    "parts", "messages", "sessions", "session",
)


def scrub_sig_tree(node):
    """Delete signature/encrypted keys inside a metadata subtree (prunes emptied dicts)."""
    changed = False
    if isinstance(node, dict):
        for key in list(node.keys()):
            if SIG_KEY_RE.search(key) and key.lower() not in KEEP_KEYS:
                del node[key]
                changed = True
            else:
                if scrub_sig_tree(node[key]):
                    changed = True
                if isinstance(node[key], dict) and not node[key]:
                    del node[key]
                    changed = True
    elif isinstance(node, list):
        for item in node:
            if scrub_sig_tree(item):
                changed = True
    return changed


def scrub_node(node):
    """Scrub stale caller-bound blobs anywhere in session JSON. True if removed."""
    changed = False
    if isinstance(node, dict):
        ntype = str(node.get("type", "")).lower()
        if ntype in THINK_TYPES:
            for key in list(node.keys()):
                if key.lower() in META_KEYS and isinstance(node[key], dict):
                    if scrub_sig_tree(node[key]):
                        changed = True
                    if not node[key]:
                        del node[key]
                        changed = True
            for key in list(node.keys()):
                if (key.lower() not in KEEP_KEYS and key.lower() not in META_KEYS
                        and SIG_KEY_RE.search(key)):
                    del node[key]
                    changed = True
        else:
            for key in list(node.keys()):
                val = node[key]
                if key.lower() in META_KEYS and isinstance(val, dict):
                    if scrub_sig_tree(val):
                        changed = True
                    if not val:
                        del node[key]
                        changed = True
                elif scrub_node(val):
                    changed = True
    elif isinstance(node, list):
        for item in node:
            if scrub_node(item):
                changed = True
    return changed


def has_prefilter(text):
    low = text.lower()
    return any(w in low for w in PREFILTER_WORDS)


def collect_session_ids(node, acc):
    if isinstance(node, dict):
        for key in ("sessionID", "session_id", "sessionId"):
            val = node.get(key)
            if isinstance(val, str) and val:
                acc.add(val)
        for value in node.values():
            collect_session_ids(value, acc)
    elif isinstance(node, list):
        for item in node:
            collect_session_ids(item, acc)


def detect_os():
    s = platform.system().lower()
    if s.startswith("win"):
        return "windows"
    if s == "darwin":
        return "macos"
    return "linux"


def db_dir_via_cli():
    """Ask the opencode CLI itself where the live DB is. Works on every OS."""
    exe = shutil.which("opencode")
    if not exe:
        return None
    try:
        proc = subprocess.run([exe, "db", "path"], capture_output=True, timeout=20)
    except Exception:
        return None
    out = proc.stdout.decode("utf-8", errors="replace").strip().splitlines()
    if not out:
        return None
    first = out[0].strip().strip('"').strip("'")
    if os.path.isfile(first) and os.path.basename(first) == "opencode.db":
        return os.path.dirname(first)
    if os.path.isdir(first) and os.path.isfile(os.path.join(first, "opencode.db")):
        return first
    return None


def candidate_data_dirs():
    """Known opencode data locations for the current OS."""
    home = os.path.expanduser("~")
    dirs = []
    xdg = os.environ.get("XDG_DATA_HOME", "")
    if xdg:
        dirs.append(os.path.join(xdg, "opencode"))
    dirs.append(os.path.join(home, ".local", "share", "opencode"))
    dirs.append(os.path.join(home, ".opencode"))
    if os.name == "nt":  # Windows
        for env in ("LOCALAPPDATA", "APPDATA"):
            base = os.environ.get(env, "")
            if base:
                dirs.append(os.path.join(base, "opencode"))
                dirs.append(os.path.join(base, "Opencode"))
    elif sys.platform == "darwin":  # macOS
        dirs.append(os.path.join(home, "Library", "Application Support", "opencode"))
        dirs.append(os.path.join(home, "Library", "Application Support", "Opencode"))
    else:  # Linux and others
        dirs.append(os.path.join(home, ".config", "opencode"))
    seen, out = set(), []
    for d in dirs:
        d = os.path.normpath(d)
        if d not in seen:
            seen.add(d)
            out.append(d)
    return out


def find_all_data_dirs():
    """Every local dir that actually holds an opencode.db (CLI hit first)."""
    found, seen = [], set()
    via = db_dir_via_cli()
    if via:
        via = os.path.normpath(via)
        if via not in seen and os.path.isfile(os.path.join(via, "opencode.db")):
            seen.add(via)
            found.append((via, "cli"))
    for d in candidate_data_dirs():
        if d not in seen and os.path.isfile(os.path.join(d, "opencode.db")):
            seen.add(d)
            found.append((d, "search"))
    return found


def resolve_explicit(path):
    """--dir accepts a data dir OR the opencode.db file itself."""
    p = os.path.normpath(os.path.expanduser(os.path.expandvars(
        path.strip().strip('"').strip("'"))))
    if os.path.isfile(p) and os.path.basename(p) == "opencode.db":
        return os.path.dirname(p)
    if os.path.isdir(p) and os.path.isfile(os.path.join(p, "opencode.db")):
        return p
    return None


def opencode_running():
    """Best-effort check. True / False / None (unknown)."""
    try:
        if os.name == "nt":
            out = subprocess.run(["tasklist", "/NH"], capture_output=True,
                                 text=True, timeout=15).stdout.lower() or ""
            return "opencode.exe" in out
        if shutil.which("pgrep"):
            proc = subprocess.run(["pgrep", "-x", "opencode"],
                                  capture_output=True, timeout=15)
            return proc.returncode == 0
        if shutil.which("ps"):
            proc = subprocess.run(["ps", "-A", "-o", "comm="], capture_output=True,
                                  text=True, timeout=15)
            return "opencode" in ((proc.stdout or "").lower().split())
    except Exception:
        pass
    return None


def backup_data_dir(datadir, ts):
    """Opt-in (--backup) copy of the DB files. Off by default: no junk."""
    dest = datadir + "-backup-" + ts
    os.makedirs(dest, exist_ok=True)
    for name in ("opencode.db", "opencode.db-wal", "opencode.db-shm",
                 "opencode.db-journal"):
        src = os.path.join(datadir, name)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(dest, name))
    return dest


def list_tables(con):
    return [r[0] for r in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]


def sanitize_db(db_path):
    stats = {"rows_updated": 0, "carriers_scrubbed": 0, "sessions": set()}
    con = sqlite3.connect(db_path, timeout=60)
    try:
        for table in list_tables(con):
            try:
                cols = [(r[1], (r[2] or "").upper()) for r in
                        con.execute('PRAGMA table_info("%s")' % table.replace('"', '""'))]
            except Exception:
                continue
            text_cols = [c for c, t in cols if ("CHAR" in t or "TEXT" in t
                                                or "CLOB" in t or "JSON" in t or t == "")]
            if not text_cols:
                continue
            try:
                sql = (con.execute("SELECT sql FROM sqlite_master WHERE name=?",
                                   (table,)).fetchone()[0] or "").upper()
            except Exception:
                sql = ""
            has_rowid = "WITHOUT ROWID" not in sql
            likes = []
            for c in text_cols:
                q = '"%s"' % c.replace('"', '""')
                likes.append("%s LIKE '%%reasoning%%'" % q)
                likes.append("%s LIKE '%%thinking%%'" % q)
                likes.append("%s LIKE '%%signature%%'" % q)
                likes.append("%s LIKE '%%encrypted%%'" % q)
            sel = (["rowid"] if has_rowid else []) + ['"%s"' % c.replace('"', '""')
                                                      for c in text_cols]
            try:
                cur = con.execute('SELECT %s FROM "%s" WHERE %s' % (
                    ", ".join(sel), table.replace('"', '""'), " OR ".join(likes)))
            except Exception:
                continue
            for row in cur.fetchall():
                for idx, col in enumerate(text_cols, start=1 if has_rowid else 0):
                    val = row[idx]
                    if not isinstance(val, str) or not has_prefilter(val):
                        continue
                    try:
                        doc = json.loads(val)
                    except Exception:
                        continue
                    before = json.dumps(doc, sort_keys=True)
                    carriers = (before.count('"type": "reasoning"')
                                + before.count('"type": "thinking"')
                                + before.count('"type": "redacted_thinking"'))
                    if not scrub_node(doc):
                        continue
                    if has_rowid:
                        con.execute('UPDATE "%s" SET "%s"=? WHERE rowid=?' % (
                            table.replace('"', '""'), col.replace('"', '""')),
                            (json.dumps(doc, ensure_ascii=False), row[0]))
                        stats["rows_updated"] += 1
                    stats["carriers_scrubbed"] += carriers
                    collect_session_ids(doc, stats["sessions"])
        con.commit()
        try:
            con.execute("PRAGMA integrity_check")
        except Exception:
            pass
        if stats["rows_updated"]:
            try:
                con.execute("VACUUM")
            except Exception:
                pass
    finally:
        con.close()
    return stats


def scrub_json_file(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
    except Exception:
        return False
    if not has_prefilter(text):
        return False
    if path.endswith(".jsonl"):
        lines = text.splitlines()
        changed_any = False
        out = []
        for line in lines:
            if not line.strip():
                out.append(line)
                continue
            try:
                doc = json.loads(line)
            except Exception:
                out.append(line)
                continue
            if scrub_node(doc):
                changed_any = True
                out.append(json.dumps(doc, ensure_ascii=False))
            else:
                out.append(line)
        if not changed_any:
            return False
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(out) + ("\n" if text.endswith("\n") else ""))
        return True
    try:
        doc = json.loads(text)
    except Exception:
        return False
    if not scrub_node(doc):
        return False
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    return True


def sanitize_file_stores(datadir):
    stats = {"files_updated": 0}
    for sub in FILE_STORE_SUBDIRS:
        root = os.path.join(datadir, sub)
        if not os.path.isdir(root):
            continue
        for dirpath, _d, filenames in os.walk(root):
            for name in filenames:
                if not (name.endswith(".json") or name.endswith(".jsonl")):
                    continue
                if scrub_json_file(os.path.join(dirpath, name)):
                    stats["files_updated"] += 1
    return stats


def main():
    ap = argparse.ArgumentParser(
        description="Remove stale encrypted_content blobs from ALL local opencode sessions.")
    ap.add_argument("--dir", default=None,
                    help="Clean only this data dir (or opencode.db file).")
    ap.add_argument("--force", action="store_true",
                    help="Skip the 'opencode is running' check.")
    ap.add_argument("--backup", action="store_true",
                    help="Copy opencode.db (+wal/shm) to a backup folder first.")
    ap.add_argument("--no-pause", action="store_true",
                    help="Do not wait for ENTER at the end.")
    args = ap.parse_args()

    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    print("=" * 60)
    print("  Fix-EncryptedContent %s (%s, %s)" % (VERSION, detect_os(), ts))
    print("  Cleans ALL sessions at once. Messages and files are kept.")
    print("=" * 60)
    print("")

    if not args.force:
        running = opencode_running()
        if running:
            print("  [!] opencode looks RUNNING. Close it fully and run again")
            print("      (or re-run with --force on a COPY of the data dir).")
            return 1
        if running is None:
            print("  (could not check running processes - continuing;")
            print("   if the DB is locked, close opencode and re-run.)")

    targets = []
    if args.dir:
        d = resolve_explicit(args.dir)
        if not d:
            print("  [ERROR] no opencode.db found at: %s" % args.dir)
            return 1
        targets.append((d, "explicit"))
    else:
        targets = find_all_data_dirs()
        if not targets:
            print("  [ERROR] no opencode database found.")
            print("  Re-run with:  python3 Fix-EncryptedContent.py --dir \"/path/to/data-dir\"")
            return 1

    print("  Data dir(s):")
    for d, how in targets:
        print("    - [%s] %s" % (how, d))
    print("")

    grand_rows = grand_files = grand_carriers = 0
    grand_sessions = set()
    for d, _how in targets:
        if args.backup:
            print("  Backup -> %s" % backup_data_dir(d, ts))
        print("  Cleaning: %s" % d)
        try:
            st = sanitize_db(os.path.join(d, "opencode.db"))
        except sqlite3.OperationalError as exc:
            print("  [ERROR] database is locked (%s)." % exc)
            print("  Close opencode and run again.")
            return 1
        fst = sanitize_file_stores(d)
        print("    db rows updated: %d, carriers scrubbed: %d, files updated: %d" % (
            st["rows_updated"], st["carriers_scrubbed"], fst["files_updated"]))
        grand_rows += st["rows_updated"]
        grand_files += fst["files_updated"]
        grand_carriers += st["carriers_scrubbed"]
        grand_sessions |= st["sessions"]

    print("")
    print("=" * 60)
    if grand_rows == 0 and grand_files == 0:
        print("  No stale signatures found - all sessions are already clean.")
    else:
        print("  DONE: %d db row(s) + %d file(s), %d carrier(s) scrubbed." % (
            grand_rows, grand_files, grand_carriers))
        if grand_sessions:
            print("  Sessions touched: %d (first 25):" % len(grand_sessions))
            for s in sorted(grand_sessions)[:25]:
                print("    - %s" % s)
        print("")
        print("  Next: start opencode and resume your old session.")
        print("  The model loses hidden reasoning but keeps full history.")
    print("=" * 60)
    if not args.no_pause and sys.stdin.isatty():
        try:
            input("  Press ENTER to close... ")
        except (EOFError, KeyboardInterrupt):
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
