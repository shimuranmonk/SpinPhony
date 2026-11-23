"""Check that each PCON document role has a readable, nonempty Markdown file."""

import argparse
from pathlib import Path


DEFAULTS = {
    "agents": "AGENTS.md",
    "continuation": "docs/CONTINUATION.md",
    "handover": "docs/HANDOVER.md",
    "decisions": "docs/DECISIONS.md",
    "architecture": "docs/ARCHITECTURE.md",
    "testing": "docs/TESTING.md",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", type=Path)
    parser.add_argument("--path", action="append", default=[], metavar="ROLE=PATH",
                        help="override one of " + ", ".join(DEFAULTS))
    args = parser.parse_args()
    root = args.repository.resolve()
    if not root.is_dir():
        parser.error("repository must be an existing directory")

    paths = DEFAULTS.copy()
    for override in args.path:
        role, separator, value = override.partition("=")
        if not separator or role not in paths or not value:
            parser.error(f"invalid mapping {override!r}")
        if Path(value).is_absolute() or Path(value).anchor:
            parser.error(f"path must be relative to the repository: {value!r}")
        paths[role] = value

    failures = 0
    for role, relative in paths.items():
        try:
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or path.suffix.lower() != ".md":
                raise ValueError("expected a Markdown file inside the repository")
            if not path.read_text(encoding="utf-8-sig").strip():
                raise ValueError("file is empty")
        except (OSError, RuntimeError, ValueError) as error:
            print(f"FAIL {role} ({relative}): {error}")
            failures += 1
        else:
            print(f"OK   {role} ({relative})")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
