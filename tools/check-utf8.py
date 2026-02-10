#!/usr/bin/env python3
import os
import sys
from typing import Iterable

TEXT_EXTENSIONS = {
    ".md",
    ".html",
    ".js",
    ".css",
    ".json",
    ".yml",
    ".yaml",
    ".scss",
    ".txt",
}

EXCLUDE_DIRS = {".git", "node_modules", ".vercel"}


def iter_files(root: str) -> Iterable[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for filename in filenames:
            if os.path.splitext(filename)[1].lower() in TEXT_EXTENSIONS:
                yield os.path.join(dirpath, filename)


def check_utf8(path: str) -> list[tuple[int, str]]:
    errors: list[tuple[int, str]] = []
    with open(path, "rb") as handle:
        data = handle.read()
    try:
        data.decode("utf-8")
    except UnicodeDecodeError as exc:
        errors.append((exc.start, str(exc)))
    return errors


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    failures = 0
    for file_path in iter_files(root):
        for offset, message in check_utf8(file_path):
            rel_path = os.path.relpath(file_path, root)
            print(f"{rel_path}: invalid UTF-8 at byte {offset} ({message})")
            failures += 1
    if failures:
        print(f"\nFound {failures} file(s) with invalid UTF-8.")
        return 1
    print("All checked files are valid UTF-8.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
