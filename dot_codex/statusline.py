"""Render the Dotfiles footer from Codex's local MCP status snapshot."""

import json
import re
import subprocess
import sys
from pathlib import Path

URI = "ui://dotfiles-statusline/footer"
TOOL = {
    "name": "statusline",
    "title": "Dotfiles",
    "inputSchema": {"type": "object"},
    "_meta": {"openai/ui": {"entrypoints": [{"type": "statusline", "resourceUri": URI}]}},
}


def branch_for(cwd):
    try:
        return subprocess.check_output(
            ["/usr/bin/git", "symbolic-ref", "--quiet", "--short", "HEAD"],
            cwd=cwd, stderr=subprocess.DEVNULL, text=True, timeout=0.25,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def render(state):
    thread = state.get("thread", {})
    cwd = thread.get("workspace", {}).get("cwd")
    model_info = thread.get("model", {})
    model = model_info.get("display_name") or model_info.get("id") or ""
    model = re.sub(r"^gpt-", "", model, flags=re.IGNORECASE)
    context = thread.get("usage", {}).get("context", {}).get("used_percentage")
    limits = state.get("account", {}).get("rate_limits", [])
    # Prefer the account's Codex allowance when multiple buckets have 5h windows.
    five_hour = next(
        (
            window["used_percent"]
            for limit in sorted(limits, key=lambda entry: entry["limit_id"] != "codex")
            for window in (limit.get("primary_limit"), limit.get("secondary_limit"))
            if window and window.get("window_minutes") == 300
        ),
        None,
    )
    context_color = "status-usage"
    if context is not None and context >= 70:
        context_color = "red" if context >= 90 else "yellow"

    branch = branch_for(cwd) if cwd else ""
    segments = [
        (Path(cwd).name or cwd if cwd else "", "status-path"),
        (branch, "status-branch"),
        ("|" if branch and model else "", "status-metadata"),
        (model, "status-model"),
        (f"ctx:{context:.0f}%" if context is not None else "", context_color),
        (f"5h:{five_hour:.0f}%" if five_hour is not None else "", "status-limit"),
    ]
    children = [
        {"type": "text", "props": {"color": color}, "children": [label]}
        for label, color in segments
        if label
    ]
    return {"type": "row", "props": {"gap": 2}, "children": children} if children else None


def respond(method, params):
    if method == "initialize":
        return {
            "protocolVersion": "2025-06-18",
            "capabilities": {"tools": {}, "resources": {}},
            "serverInfo": {"name": "dotfiles-statusline", "version": "1.0"},
        }
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": [TOOL]}
    if method == "resources/list":
        return {"resources": [{"uri": URI, "name": "Dotfiles footer", "mimeType": "application/json"}]}
    if method == "resources/templates/list":
        return {"resourceTemplates": []}
    if method == "resources/read":
        if params.get("uri") != URI:
            raise ValueError("Unknown resource URI")
        state = params.get("_meta", {}).get("com.openai/codex-statusline-state", {})
        return {"contents": [{"uri": URI, "mimeType": "application/json", "text": json.dumps(render(state))}]}
    raise KeyError(method)


def main():
    for line in sys.stdin:
        reply = {"jsonrpc": "2.0", "id": None}
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or not isinstance(request.get("method"), str):
                reply["error"] = {"code": -32600, "message": "Invalid request"}
            elif "id" not in request:
                continue
            else:
                reply["id"] = request["id"]
                reply["result"] = respond(request["method"], request.get("params", {}))
        except json.JSONDecodeError:
            reply["error"] = {"code": -32700, "message": "Parse error"}
        except KeyError:
            reply["error"] = {"code": -32601, "message": "Method not found"}
        except (TypeError, ValueError, AttributeError):
            reply["error"] = {"code": -32602, "message": "Invalid parameters"}
        print(json.dumps(reply), flush=True)


if __name__ == "__main__":
    main()
