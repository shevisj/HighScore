#!/usr/bin/env python3
"""Generate a HighScore write token.

When a HighScore instance runs with HIGHSCORE_WRITE_PASSWORD set and
HIGHSCORE_WRITE_TOKEN=true, every write (POST/PUT/DELETE on /api/scores)
must carry a per-request HMAC token in the `x-highscore-token` header.

The token is HMAC-SHA256, keyed by the shared password, over the request
payload joined with newlines in a fixed order:

    name + "\\n" + value + "\\n" + category + "\\n" + id

Absent fields are the empty string. This binds a token to its exact payload,
so a captured token cannot be reused to write a different score. See
docs/guide/scores.md for the matching server-side reference.

This mirrors `signWriteMessage`/`buildWriteMessage` in src/config/write/index.ts.

Examples
--------
Submit a score (POST has no id):

    token=$(python3 scripts/generate_write_token.py \\
        --password "$HIGHSCORE_WRITE_PASSWORD" \\
        --name "Player name" --value 1000)

    curl -X POST http://localhost:8081/api/scores \\
        -H "Content-Type: application/json" \\
        -H "x-highscore-token: $token" \\
        -d '{"name": "Player name", "value": 1000}'

With a category:

    python3 scripts/generate_write_token.py -p secret -n Ada -s 1000 -c hard

Update or delete an existing score (include its id):

    python3 scripts/generate_write_token.py -p secret -n Ada -s 1000 --id 63a2a0c87ce37ecb74897485
"""

import argparse
import hashlib
import hmac
import sys


def build_message(name="", value="", category="", id=""):
    """Build the canonical, newline-joined message a token is signed over.

    Every field is coerced to a string; ``None`` becomes the empty string,
    matching the server's ``String(v)`` / empty-string handling.
    """
    fields = [name, value, category, id]
    return "\n".join("" if v is None else str(v) for v in fields)


def generate_token(password, name="", value="", category="", id=""):
    """Return the hex HMAC-SHA256 token for the given payload."""
    message = build_message(name=name, value=value, category=category, id=id)
    return hmac.new(
        password.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Generate a HighScore write token (HMAC-SHA256).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="The value/score must be the same string you send in the JSON "
               "body (e.g. 1000, not 1000.0).",
    )
    parser.add_argument("-p", "--password", required=True,
                        help="shared write secret (HIGHSCORE_WRITE_PASSWORD)")
    parser.add_argument("-n", "--name", default="",
                        help="player name (as sent in the request body)")
    parser.add_argument("-s", "--value", "--score", dest="value", default="",
                        help="score value (as sent in the request body)")
    parser.add_argument("-c", "--category", default="",
                        help="category, if any (default: none)")
    parser.add_argument("--id", default="",
                        help="score id, for PUT/DELETE (default: none)")
    parser.add_argument("--show-message", action="store_true",
                        help="also print the signed message to stderr (debug)")

    args = parser.parse_args(argv)

    if args.show_message:
        message = build_message(
            name=args.name, value=args.value,
            category=args.category, id=args.id,
        )
        print("signed message (repr):", repr(message), file=sys.stderr)

    token = generate_token(
        args.password,
        name=args.name,
        value=args.value,
        category=args.category,
        id=args.id,
    )
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
