// Diff popout: review every uncommitted change in the focused pane's repo, then send your
// agent one batch of notes about it.
//
// Changed files on the left, the selected file's diff (against HEAD: staged and unstaged
// together, untracked files as all-new) on the right, side by side or unified.
// Drag over lines in the diff (or click, then shift-click to extend; in side by side the half
// you press picks old or new code): on release a chip for them goes into the draft at the
// bottom and the draft takes the keyboard. Write around the chips; Shift+Enter is a new
// line, Enter sends the whole draft to your agent (the tab's agent, else the pane you opened
// this from) with `hc send`, each chip expanded to its file, lines, old/new and the code.
// While typing, the first click on the diff (or Esc) just returns you to diff navigation.
// Per space: switching spaces closes it and coming back reopens it with your file and draft.
// Double-click a file in the list to quote the whole file.
//
// Keys (diff): ↑/↓ or j/k file · n/p next/previous change · s side by side/unified ·
// c or / draft · r refresh · Esc close.
// Git reads follow Herdr's Changes panel (mods/changes): read-only flags, so the folder
// watch doesn't see our own reads.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, Scrollbar, ScrollHandle, TextareaState, Textarea } from "gpui-base";
import { spaces, panes, focused, exec, hc, readTextFile, watchFolder, theme, props, closeOverlay, checking, shared, setShared } from "herdr";

const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];
// Rows are a plain list (each row takes mouse presses for selecting), so a file shows its first 2000 diff lines.
const MAX_FILES = 1000, MAX_LINES = 2000, MAX_LINE = 2000, MAX_QUOTE = 40;
const ROW = 20, FILE_ROW = 24, CHAR = 7.3;
// Per space, while Herdr runs: the draft, and which file you were on.
const DRAFTS = new Map(), PLACES = new Map();
// Shared "diffpop.spaces" {spaceId: true}: spaces where the popout is open. Switching away
// closes it and keeps the entry; the sidebar (mods/my-sidebar) reopens it when you return.
// "diffpop.live": whether a popout is open now. Closing it yourself drops the space's entry.
// A chip can only hold one line of text, so its full quote lives here, by chip id.
const QUOTES = new Map();

// Where to look: the focused pane's folder, on its space's machine.
function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}

// Who the draft goes to: the agent in the focused tab (the focused pane's if it is one),
// else the focused terminal.
function target() {
  const f = focused();
  if (!f) return null;
  const inTab = panes().filter((p) => p.tab === f.tab && p.terminal);
  const here = inTab.find((p) => p.pane === f.pane);
  const pick = (here?.program?.agent && here) || inTab.find((p) => p.program?.agent) || here || (f.terminal && { terminal: f.terminal });
  if (!pick?.terminal) return null;
  return { terminal: pick.terminal, name: pick.program?.name ?? pick.title ?? pick.terminal, agent: Boolean(pick.program?.agent) };
}

const countLines = (text) => (text ? text.split("\n").length - Number(text.endsWith("\n")) : 0);
// Text draws a tab as nothing: pad each to the next 4-column stop.
const untab = (text) => text.replace(/[^\t]*\t/g, (s) => s.slice(0, -1).padEnd((s.length - 1) - (s.length - 1) % 4 + 4));
const base = (path) => path.split("/").pop();

// Diff lines → unified rows (old/new numbers) and side-by-side rows (removed lines paired
// with the added lines that replace them), each with the row index of every hunk for n/p.
function diffRows(lines) {
  let old = 0, now = 0;
  const uni = [], uniHunks = [], split = [], splitHunks = [];
  let dels = [], adds = [];
  const flush = () => {
    for (let i = 0; i < Math.max(dels.length, adds.length); i++) split.push({ kind: "pair", l: dels[i] ?? null, r: adds[i] ?? null });
    dels = []; adds = [];
  };
  for (const raw of lines) {
    const line = raw.length > MAX_LINE ? raw.slice(0, MAX_LINE) + " …" : raw;
    const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);
    if (m) {
      flush();
      old = +m[1]; now = +m[2];
      const head = { kind: "@", text: m[3].trim(), line: now };
      uniHunks.push(uni.length); uni.push(head);
      splitHunks.push(split.length); split.push(head);
      continue;
    }
    const k = line[0], text = untab(line.slice(1)) || " ";
    if (k === "-") { uni.push({ kind: "-", old, text }); dels.push({ kind: "-", num: old++, text }); }
    else if (k === "+") { uni.push({ kind: "+", now, text }); adds.push({ kind: "+", num: now++, text }); }
    else if (k === " ") {
      flush();
      uni.push({ kind: " ", old, now, text });
      split.push({ kind: "pair", l: { kind: " ", num: old, text }, r: { kind: " ", num: now, text } });
      old++; now++;
    } else if (line.startsWith("\\")) { flush(); const n = { kind: "note", text: line.slice(2) }; uni.push(n); split.push(n); }
  }
  flush();
  return { uni, uniHunks, split, splitHunks };
}

export default class DiffPop extends View {
  init(_props, cx) {
    this.files = []; this.diff = diffRows([]); this.at = 0; this.width = 0; this.half = 0;
    this.sel = null; this.dragging = false; this.refs = 0;
    try { this.mode = localStorage.getItem("mode") || "split"; } catch { this.mode = "split"; }
    this.handle = cx.focus_handle();
    this.fileScroll = ScrollHandle.new();
    this.diffScroll = ScrollHandle.new();
    this.draft = TextareaState.new({ placeholder: "Select lines to quote them, write your notes, Enter to send" });
    this.draft.set_auto_grow(1, 8);
    this.draft.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.draft.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    this.draft.on("submit", (e, cx) => { if (!e?.shift) this.send(cx); });
    this.draft.on("change", (_e, cx) => { if (this.space) DRAFTS.set(this.space, this.draft.content()); cx.notify(); });
    this.handle.focus();
    cx.timer.after(150, () => this.handle.focus());
    if (checking()) return;
    this.space = spaces().find((s) => s.active)?.id;
    const kept = DRAFTS.get(this.space);
    if (kept) this.draft.set_value(kept);
    setShared("diffpop.spaces", { ...(shared("diffpop.spaces") ?? {}), [this.space]: true });
    setShared("diffpop.live", true);
    // Another space shown: put this one away (it comes back when you return).
    cx.timer.every(250, () => {
      if (this.closed || spaces().find((s) => s.active)?.id === this.space) return;
      this.leaving = true;
      PLACES.set(this.space, { path: this.files[this.at]?.path });
      this.shut();
    });
    this.where = location();
    this.to = target();
    this.refresh(cx);
  }

  async close() {
    this.closed = true;
    setShared("diffpop.live", false);
    if (this.leaving || !this.space) return;
    // Closed on purpose: don't reopen it in this space.
    const open = { ...(shared("diffpop.spaces") ?? {}) };
    delete open[this.space];
    setShared("diffpop.spaces", open);
    PLACES.delete(this.space);
  }

  shut() { this.closed = true; closeOverlay(props()?.overlay); }

  git(args) { return exec("git", [...READ, ...args], { cwd: this.root, on: this.where.on }); }

  rows() { return this.mode === "split" ? this.diff.split : this.diff.uni; }
  hunks() { return this.mode === "split" ? this.diff.splitHunks : this.diff.uniHunks; }

  refresh(cx) {
    if (this.loading || !this.where?.cwd) { if (!this.where?.cwd) this.error = "No folder"; return; }
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const { cwd, on } = this.where;
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
        if (top.code !== 0) { this.error = "Not a git repository"; this.files = []; return; }
        const root = top.stdout.trim();
        this.root = root;
        const [status, head, branch] = await Promise.all([
          this.git(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]),
          this.git(["rev-parse", "--verify", "HEAD"]),
          this.git(["branch", "--show-current"]),
        ]);
        if (status.code !== 0) throw new Error(status.stderr);
        this.hasHead = head.code === 0;
        this.branch = branch.stdout.trim();
        const stats = {};
        const results = this.hasHead
          ? [await this.git(["diff", "HEAD", "--numstat", "-z", "--no-renames"])]
          : [await this.git(["diff", "--cached", "--numstat", "-z", "--no-renames"]), await this.git(["diff", "--numstat", "-z", "--no-renames"])];
        for (const r of results) {
          for (const entry of r.stdout.split("\0")) {
            const [a, d, ...parts] = entry.split("\t");
            if (!parts.length) continue;
            const path = parts.join("\t"), s = stats[path] ?? { add: 0, del: 0 };
            stats[path] = { add: s.add + (Number(a) || 0), del: s.del + (Number(d) || 0), binary: a === "-" };
          }
        }
        const entries = status.stdout.split("\0").filter(Boolean);
        const files = entries.slice(0, MAX_FILES).map((e) => {
          const xy = e.slice(0, 2), path = e.slice(3), fresh = xy === "??";
          const conflict = xy.includes("U") || xy === "AA" || xy === "DD";
          const kind = conflict ? "U" : xy.includes("D") ? "D" : fresh || xy.includes("A") ? "A" : "M";
          return { path, kind, fresh, staged: !fresh && xy[0] !== " ", ...(stats[path] ?? { add: 0, del: 0 }) };
        }).sort((a, b) => a.path.localeCompare(b.path));
        const keep = this.files[this.at]?.path ?? PLACES.get(this.space)?.path;
        this.files = files; this.limited = entries.length > MAX_FILES; this.error = null;
        const again = files.findIndex((f) => f.path === keep);
        await this.select(again >= 0 ? again : 0, cx, again >= 0);
        this.watch(cx);
      } catch (e) { this.error = String(e.message ?? e); }
      finally { this.loading = false; cx.notify(); }
    });
  }

  // Refresh while open when the work tree changes (local repos only).
  watch(cx) {
    if (this.watching || this.where.on || !this.root) return;
    this.watching = true;
    cx.spawn(async (cx) => {
      try {
        while (!this.closed) {
          await watchFolder(this.root);
          if (this.closed) break;
          this.refresh(cx);
        }
      } catch {}
    });
  }

  async select(i, cx, keepScroll = false) {
    if (!this.files.length) { this.diff = diffRows([]); this.sel = null; return; }
    this.at = Math.max(0, Math.min(i, this.files.length - 1));
    this.fileScroll.scroll_to_item(this.at);
    const file = this.files[this.at], path = file.path;
    let lines;
    try {
      if (file.fresh || (!this.hasHead && file.kind === "A")) {
        const text = await readTextFile(`${this.root}/${path}`, { on: this.where.on }).catch(() => null);
        if (text === null) lines = ["\\ Can't preview this file (binary, too large or unreadable)"];
        else if (text.includes("\0")) lines = ["\\ Binary file"];
        else { file.add = countLines(text); lines = [`@@ -0,0 +1,${file.add} @@ new file`, ...text.replace(/\n$/, "").split("\n").slice(0, MAX_LINES).map((l) => `+${l}`)]; }
      } else {
        const r = await this.git(["diff", ...(this.hasHead ? ["HEAD"] : []), "--no-ext-diff", "--no-textconv", "--no-color", "--", path]);
        if (r.code !== 0) throw new Error(r.stderr);
        const all = r.stdout.replace(/\n$/, "").split("\n"), first = all.findIndex((l) => l.startsWith("@@"));
        lines = first < 0 ? [file.binary ? "\\ Binary file changed" : "\\ No text changes (mode or rename only)"] : all.slice(first, first + MAX_LINES);
      }
    } catch (e) { lines = [`\\ Can't show this diff: ${e.message ?? e}`]; }
    if (this.files[this.at]?.path !== path) return; // moved on meanwhile
    const same = keepScroll && this.diffPath === path;
    this.diff = diffRows(lines); this.diffPath = path;
    if (!same) { this.hunk = null; this.sel = null; }
    const longest = Math.max(0, ...this.diff.uni.map((r) => r.text.length));
    this.width = Math.max(400, longest * CHAR + 110);
    this.half = Math.max(360, longest * CHAR + 70);
    if (!keepScroll) this.diffScroll.scroll_to_item(0);
    cx.notify();
  }

  move(by, cx) {
    if (!this.files.length) return;
    const i = (this.at + by + this.files.length) % this.files.length;
    this.at = i; cx.notify();
    cx.spawn(async (cx) => { await this.select(i, cx); });
  }

  jump(by, cx) {
    const hunks = this.hunks();
    if (!hunks.length) return;
    this.hunk = this.hunk === null || this.hunk === undefined ? (by > 0 ? 0 : hunks.length - 1) : (this.hunk + by + hunks.length) % hunks.length;
    this.diffScroll.scroll_to_item(hunks[this.hunk]);
    cx.notify();
  }

  toggleMode(cx) {
    this.mode = this.mode === "split" ? "unified" : "split";
    try { localStorage.setItem("mode", this.mode); } catch {}
    this.sel = null;
    this.diffScroll.scroll_to_item(this.hunk !== null && this.hunk !== undefined ? this.hunks()[this.hunk] ?? 0 : 0);
    cx.notify();
  }

  // ── Selecting lines ────────────────────────────────────────────────────────────────

  // side: "old" | "new" (a half in side by side) or "uni" (a unified row).
  press(i, side, e, cx) {
    if (this.typing) { this.typing = false; this.handle.focus(); cx.notify(); return; } // just come back
    this.handle.focus();
    if (e.modifiers?.shift && this.sel && this.sel.side === side && this.sel.path === this.diffPath) {
      this.sel.b = i; this.quote(cx); return;
    }
    this.sel = { side, a: i, b: i, path: this.diffPath };
    this.dragging = true; this.moved = false; this.from = e.position;
    cx.notify();
  }

  // A drag is reaching another line, or moving more than 4px: the jitter of a click isn't.
  drag(i, side, e, cx) {
    if (!this.dragging || this.sel?.side !== side) return;
    const p = e?.position, o = this.from;
    if (i !== this.sel.a || (p && o && Math.hypot(p.x - o.x, p.y - o.y) > 4)) this.moved = true;
    if (this.sel.b !== i) { this.sel.b = i; cx.notify(); }
  }

  release(cx) {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved) this.quote(cx); // a plain click only marks the line
    else cx.notify();
  }

  inSel(i, side) {
    const s = this.sel;
    return Boolean(s && s.side === side && s.path === this.diffPath && i >= Math.min(s.a, s.b) && i <= Math.max(s.a, s.b));
  }

  // The selected lines as [mark, number, text], mark "-" old, "+" new, " " both.
  picked() {
    const s = this.sel, rows = this.rows(), out = [];
    if (!s) return out;
    for (let i = Math.min(s.a, s.b); i <= Math.max(s.a, s.b); i++) {
      const r = rows[i];
      if (!r) continue;
      if (s.side === "uni") {
        if (r.kind === "-") out.push(["-", r.old, r.text]);
        else if (r.kind === "+") out.push(["+", r.now, r.text]);
        else if (r.kind === " ") out.push([" ", r.now, r.text, r.old]);
      } else if (r.kind === "pair") {
        const c = s.side === "old" ? r.l : r.r;
        if (c) out.push([c.kind, c.num, c.text]);
      }
    }
    return out;
  }

  // Selection → a chip in the draft at its cursor; the chip's text is what the agent gets.
  quote(cx) {
    const lines = this.picked(), path = this.sel?.path;
    if (!lines.length || !path) { cx.notify(); return; }
    const marks = new Set(lines.map((l) => l[0]));
    const side = this.sel.side === "old" ? "old" : this.sel.side === "new" ? "new"
      : marks.has("-") && (marks.has("+") || marks.has(" ")) ? "old → new" : marks.has("-") ? "old" : "new";
    const nums = (side === "old" ? lines.map((l) => (l[0] === " " && l[3] !== undefined ? l[3] : l[1]))
      : lines.filter((l) => l[0] !== "-").map((l) => l[1])).filter((n) => n !== undefined);
    const first = Math.min(...nums), last = Math.max(...nums);
    const range = !nums.length ? "" : first === last ? `${first}` : `${first}-${last}`;
    const shown = lines.slice(0, MAX_QUOTE).map(([m, , text]) => `${m} ${text}`);
    if (lines.length > MAX_QUOTE) shown.push(`… ${lines.length - MAX_QUOTE} more lines`);
    const what = side === "old" ? "old code (before the change)" : side === "new" ? "new code (after the change)" : "old → new (the change)";
    const text = `\n\`${path}\` line${first === last ? "" : "s"} ${range}, ${what}:\n\`\`\`diff\n${shown.join("\n")}\n\`\`\`\n`;
    const label = `${base(path)}:${range.replace("-", "–")} ${side}`;
    this.refs += 1;
    const id = `ref-${Date.now()}-${this.refs}`;
    QUOTES.set(id, text);
    this.draft.replace_with_token({ id, text: `[${label}]`, label });
    this.draft.replace(" ");
    this.draft.focus();
    cx.notify();
  }

  quoteFile(f, cx) {
    this.refs += 1;
    const id = `file-${Date.now()}-${this.refs}`;
    const state = f.fresh ? "new, untracked" : f.kind === "D" ? "deleted" : f.kind === "A" ? "added" : "changed";
    QUOTES.set(id, `\n\`${f.path}\` (the whole file: ${state}, +${f.add} −${f.del})\n`);
    this.draft.replace_with_token({ id, text: `[${f.path}]`, label: base(f.path) });
    this.draft.replace(" ");
    this.draft.focus();
    cx.notify();
  }

  // ── Sending ────────────────────────────────────────────────────────────────────────

  // The draft with every chip expanded to its quote.
  expanded() {
    const { text, tokens } = this.draft.content();
    let out = "", at = 0;
    for (const span of [...(tokens ?? [])].sort((a, b) => a.range.start - b.range.start)) {
      out += text.slice(at, span.range.start) + (QUOTES.get(span.token.id) ?? span.token.text);
      at = span.range.end;
    }
    return (out + text.slice(at)).replace(/\n{3,}/g, "\n\n").trim();
  }

  send(cx) {
    if (this.sending || !this.to) return;
    const body = this.expanded();
    if (!body) return;
    const repo = this.root ? this.root.split("/").pop() : "";
    const message = `[diff review] ${repo}${this.branch ? ` (${this.branch})` : ""}, uncommitted changes:\n\n${body}`;
    this.sending = true; this.sent = null; cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["send", this.to.terminal, message]);
        if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "hc send failed");
        this.draft.set_value("");
        if (this.space) DRAFTS.delete(this.space);
        this.sel = null;
        this.sent = this.to.agent ? "Sent to agent" : "Sent to shell";
      } catch (e) { this.sent = `Not sent: ${e.message ?? e}`; }
      finally { this.sending = false; cx.notify(); }
    });
  }

  key(e, cx) {
    const k = e.key;
    if (this.typing) {
      if (k === "escape") { this.typing = false; this.handle.focus(); cx.stop_propagation(); cx.notify(); }
      else if (k === "enter" && !e.modifiers?.shift) { this.send(cx); cx.stop_propagation(); }
      return; // everything else is typing (Shift+Enter, arrows…)
    }
    if (k === "escape") this.shut();
    else if (k === "down" || k === "j") this.move(1, cx);
    else if (k === "up" || k === "k") this.move(-1, cx);
    else if (k === "n" || k === "]") this.jump(1, cx);
    else if (k === "p" || k === "[") this.jump(-1, cx);
    else if (k === "s") this.toggleMode(cx);
    else if (k === "c" || k === "/") { this.draft.focus(); this.sent = null; cx.notify(); }
    else if (k === "r") this.refresh(cx);
    else return;
    cx.stop_propagation();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────────────

  fileRow(f, i, t) {
    const on = i === this.at, parts = f.path.split("/"), name = parts.pop();
    const mark = { A: t.ansi2, D: t.ansi1, U: t.ansi1, M: t.working }[f.kind] ?? t.muted;
    return h_flex().id(`f-${i}`).h(FILE_ROW).flex_none().px(10).gap(8).items_center().cursor_pointer()
      .hover((h) => h.bg(t.hover))
      .on_mouse_down("left", (e, cx) => { if (e.click_count === 2) this.quoteFile(f, cx); })
      .on_click((_e, cx) => { if (this.at === i && this.diffPath === f.path) return; this.handle.focus(); this.at = i; cx.notify(); cx.spawn(async (cx) => { await this.select(i, cx); }); })
      .child(div().w(10).flex_none().text_size(11).text_color(mark).child(f.kind))
      .child(h_flex().flex_1().min_w(0)
        .child(div().flex_shrink_1().min_w(0).truncate().text_color(t.dim).child(parts.length ? parts.join("/") + "/" : ""))
        .child(div().flex_none().text_color(on ? t.accent : t.foreground).child(name)))
      .when(f.add > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.ansi2).child(`+${f.add}`)))
      .when(f.del > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.ansi1).child(`−${f.del}`)));
  }

  tint(kind, t) { return kind === "+" ? `${t.ansi2}1c` : kind === "-" ? `${t.ansi1}1c` : null; }

  // Mouse handlers that make a row (or a half) selectable.
  selectable(el, i, side) {
    return el.on_mouse_down("left", (e, cx) => this.press(i, side, e, cx))
      .on_mouse_move((e, cx) => this.drag(i, side, e, cx))
      .on_mouse_up("left", (_e, cx) => this.release(cx));
  }

  header(r, t) {
    return h_flex().w_full().h(ROW).flex_none().px(10).gap(10).items_center().bg(t.raised).text_color(t.dim)
      .child(div().flex_none().child(r.line ? `line ${r.line}` : "⋯")).child(div().whitespace_nowrap().child(r.text));
  }

  note(r, t) { return h_flex().w_full().h(ROW).flex_none().px(10).items_center().text_color(t.dim).child(r.text); }

  diffRow(r, i, t) {
    if (r.kind === "@") return this.header(r, t);
    if (r.kind === "note") return this.note(r, t);
    const num = (n) => div().w(40).flex_none().text_right().text_color(t.dim).child(n === undefined ? "" : String(n));
    const sign = r.kind === " " ? " " : r.kind === "+" ? "+" : "−";
    const bg = this.inSel(i, "uni") ? t.selection : this.tint(r.kind, t);
    return this.selectable(h_flex().id(`u-${i}`).w_full().h(ROW).flex_none().gap(8).items_center().when(Boolean(bg), (el) => el.bg(bg))
      .child(num(r.old)).child(num(r.now))
      .child(div().w(10).flex_none().text_color(r.kind === "+" ? t.ansi2 : r.kind === "-" ? t.ansi1 : t.dim).child(sign))
      .child(div().flex_1().whitespace_nowrap().child(r.text)), i, "uni");
  }

  // One side of a side-by-side row; null is the empty side of an unmatched line.
  side(c, i, side, t) {
    const el = h_flex().id(`${side}-${i}`).flex_1().min_w(this.half).h_full().gap(8).items_center();
    if (!c) return el.bg(`${t.border}66`);
    const bg = this.inSel(i, side) ? t.selection : this.tint(c.kind, t);
    return this.selectable(el.when(Boolean(bg), (e) => e.bg(bg))
      .child(div().w(40).flex_none().text_right().text_color(t.dim).child(String(c.num)))
      .child(div().flex_1().whitespace_nowrap().child(c.text)), i, side);
  }

  splitRow(r, i, t) {
    if (r.kind === "@") return this.header(r, t);
    if (r.kind === "note") return this.note(r, t);
    return h_flex().w_full().h(ROW).flex_none()
      .child(this.side(r.l, i, "old", t))
      .child(div().w(1).flex_none().h_full().bg(t.border))
      .child(this.side(r.r, i, "new", t));
  }

  composer(t) {
    const to = this.to;
    const who = !to ? "no terminal to send to" : to.agent ? "to agent" : "to shell: runs as a command";
    const chips = this.draft.tokens().length;
    const status = this.sending ? "sending…" : this.sent ?? (this.typing ? `↵ send ${who} · ⇧↵ new line · esc back` : `c write ${who}`);
    return v_flex().id("dp-draft").flex_none().border_t(1).border_color(this.typing ? t.accent : t.border)
      .child(h_flex().px(12).pt(6).gap(10).items_start()
        .child(div().flex_none().pt(2).text_color(this.typing ? t.accent : t.dim).child("›"))
        .child(div().flex_1().min_w(0).child(Textarea.new(this.draft).w_full().text_size(12.5).text_color(t.foreground)
          .token((tok) => div().px(4).rounded(3).bg(`${t.accent}26`).text_color(t.accent).text_size(11.5).child(tok.token.label ?? "quote")))))
      .child(h_flex().h(22).px(12).gap(10).items_center().text_size(11)
        .child(div().text_color(t.dim).child(chips ? `${chips} quote${chips === 1 ? "" : "s"}` : ""))
        .child(div().flex_1())
        .child(div().text_color(this.sent?.startsWith("Not") ? t.blocked : t.dim).child(status)));
  }

  render() {
    const t = theme();
    const f = this.files[this.at], split = this.mode === "split", rows = this.rows(), hunks = this.hunks();
    const add = this.files.reduce((n, x) => n + x.add, 0), del = this.files.reduce((n, x) => n + x.del, 0);
    const repo = this.root ? this.root.split("/").pop() : "";
    const hint = (k, label) => h_flex().gap(4).child(div().text_color(t.muted).child(k)).child(div().text_color(t.dim).child(label));
    return v_flex().id("diff-pop").track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx))
      .on_mouse_up("left", (_e, cx) => this.release(cx))
      .size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(12.5)
      // Header: repo · branch · totals, and the keys.
      .child(h_flex().id("dp-head").h(30).flex_none().px(12).gap(10).items_center().border_b(1).border_color(t.border)
        .on_mouse_down("left", (_e, cx) => { this.handle.focus(); cx.notify(); })
        .child(div().text_color(t.accent).child(repo || "Changes"))
        .when(Boolean(this.branch), (el) => el.child(div().text_color(t.dim).child(this.branch)))
        .child(div().text_color(t.dim).child(`${this.files.length} file${this.files.length === 1 ? "" : "s"}`))
        .when(add > 0, (el) => el.child(div().text_color(t.ansi2).child(`+${add}`)))
        .when(del > 0, (el) => el.child(div().text_color(t.ansi1).child(`−${del}`)))
        .when(Boolean(this.loading), (el) => el.child(div().text_color(t.dim).child("…")))
        .child(div().flex_1())
        .child(h_flex().gap(12).text_size(11).child(hint("↑↓", "file")).child(hint("n p", "change"))
          .child(hint("s", split ? "unified" : "side by side")).child(hint("drag", "quote")).child(hint("2×file", "quote file")).child(hint("c", "write")).child(hint("esc", "close"))))
      .child(h_flex().flex_1().min_h(0)
        // Files
        .child(div().w(280).flex_none().h_full().relative().border_r(1).border_color(t.border)
          .child(v_flex().id("dp-files").absolute().inset_0().py(4).overflow_y_scroll().track_scroll(this.fileScroll)
            .children(this.files.map((x, i) => this.fileRow(x, i, t)))
            .when(!this.files.length, (el) => el.child(div().px(12).py(8).text_color(t.dim)
              .child(this.error || (this.loading ? "Loading…" : "No uncommitted changes"))))
            .when(Boolean(this.limited), (el) => el.child(div().px(12).py(4).text_size(11).text_color(t.dim).child(`First ${MAX_FILES} files`))))
          .child(Scrollbar.vertical("dp-files").absolute().inset_0()))
        // Diff
        .child(v_flex().flex_1().min_w(0).h_full()
          .when(Boolean(f), (el) => el.child(h_flex().h(26).flex_none().px(12).gap(8).items_center().border_b(1).border_color(t.border)
            .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(f.path))
            .when(f.staged, (e2) => e2.child(div().text_size(11).text_color(t.dim).child("staged")))
            .when(f.fresh, (e2) => e2.child(div().text_size(11).text_color(t.dim).child("untracked")))
            .when(hunks.length > 1, (e2) => e2.child(div().text_size(11).text_color(t.dim)
              .child(`${this.hunk === null || this.hunk === undefined ? "–" : this.hunk + 1}/${hunks.length} changes`)))))
          .child(div().flex_1().min_h(0).relative().text_size(12)
            .child(div().id("dp-diff-x").size_full().overflow_x_scrollbar()
              .child(v_flex().id("dp-diff").min_w(split ? this.half * 2 + 1 : this.width).h_full().overflow_y_scroll().track_scroll(this.diffScroll)
                .children(rows.map((r, i) => (split ? this.splitRow(r, i, t) : this.diffRow(r, i, t))))))
            .child(Scrollbar.vertical("dp-diff").absolute().inset_0()))))
      .child(this.composer(t));
  }
}
