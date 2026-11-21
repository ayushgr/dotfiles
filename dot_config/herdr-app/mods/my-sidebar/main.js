// One list: project groups → spaces (numbered like cmd-1…9) → the agents in each space.
// Groups come from the git repo a space's first terminal is in (worktrees join their repo);
// right-click a space → "Move to group…" to pin it to a named group (shared "sidebar.groups").
// Spaces always stay in Herdr's order (1, 2, 3…); each run of a group gets a green line on its left,
// brighter for the active space's group (named groups also show their name). Spaces outside any repo group by their folder.
// Header toggle: grouping on/off.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, panes, run, openOverlay, exec, theme, shared, setShared, layout, checking, props, home } from "herdr";

// Group lines are all the accent green: the active space's group full strength and wider,
// the others faded. Theme colours are "#rrggbb"; anything else is used as is.
const faded = (color) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}55` : color);

const ICON = "mods/workspace-chrome";
// Working: a braille spinner, TUI-style (Herdr animates it natively, no timer).
const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const spinner = (t) => div().text_color(t.working).frames(SPIN, 80);
// Row layout shared by spaces and agents (px).
const PAD = 4, LEAD = 14, GAP = 6;
const URGENCY = { blocked: 4, done: 3, working: 2, idle: 1 };

function find(node, id) {
  if (node?.id === id) return node;
  for (const c of node?.children ?? []) { const f = find(c, id); if (f) return f; }
  return null;
}
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// Where a space is now: its first terminal's live folder, else where it was made.
function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder || "";
}
const base = (path) => path.replace(/\/+$/, "").split("/").pop() || path;

// Drop a leading status glyph/spinner an agent puts before its title ("✳ Working").
const cleanTitle = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\[("'`]+/u, "").trim();

export default class Sidebar extends View {
  init(_props, cx) {
    this.repo = {};      // JSON [machine, cwd] → { key, name } | null (not a repo)
    this.asking = new Set();
    this.queue = new Set();
    this.pressed = null; this.over = null;
    if (checking()) return;
    // A cd or checkout can change a space's repo: look again now and then.
    cx.timer.every(15000, () => { for (const k of Object.keys(this.repo)) this.queue.add(k); });
    // The diff popout (mods/diff-pop) is per space: reopen it when you come back to a space
    // it was open in. Only the list copy does this; no popout survives a restart.
    if (!props()?.header) setShared("diffpop.live", false);
    cx.timer.every(500, (cx) => {
      if (!props()?.header) {
        const active = spaces().find((s) => s.active)?.id;
        if (active && (shared("diffpop.spaces") ?? {})[active] && !shared("diffpop.live")) {
          setShared("diffpop.live", true);
          run("mod.open", { name: "diff-pop" });
        }
      }
      if (this.queue.size) this.drain(cx);
      // The group picker offers these names.
      if (this.auto && JSON.stringify(shared("sidebar.auto") ?? {}) !== JSON.stringify(this.auto)) setShared("sidebar.auto", this.auto);
    });
  }

  // Render only queues; the timer asks git (async work can't start from render).
  lookup(machine, cwd) {
    const k = JSON.stringify([machine, cwd]);
    if (!cwd || k in this.repo) return this.repo[k];
    this.queue.add(k);
    return undefined;
  }

  drain(cx) {
    for (const k of this.queue) {
      if (this.asking.has(k)) continue;
      this.asking.add(k);
      const [machine, cwd] = JSON.parse(k);
      cx.spawn(async (cx) => {
        let v = null;
        try {
          const r = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on: machine, timeout: 3000 });
          if (r.code === 0) {
            const dir = r.stdout.trim().replace(/\/\.git\/?$/, "").replace(/\.git\/?$/, "");
            v = { key: `repo:${machine ?? ""}:${dir}`, name: base(dir) + (machine ? `@${machine}` : "") };
          }
        } catch {}
        const changed = JSON.stringify(this.repo[k]) !== JSON.stringify(v);
        this.repo[k] = v; this.asking.delete(k);
        if (changed) cx.notify();
      });
    }
    this.queue.clear();
  }

  // Runs of consecutive spaces sharing a group, in Herdr's space order (never reordered).
  groups(sp, ps) {
    const custom = shared("sidebar.groups") ?? {};
    const grouping = shared("sidebar.grouping") !== "none";
    const auto = {};
    const runs = [];
    sp.forEach((s, i) => {
      let key = "all", name = "", known = true;
      if (grouping) {
        const where = place(s, ps);
        const r = this.lookup(s.machine, where);
        if (r) auto[s.id] = r.name;
        if (custom[s.id]) { key = `custom:${custom[s.id]}`; name = custom[s.id]; }
        else if (r) { key = r.key; name = r.name; }
        else if (r === undefined) { known = false; key = runs.at(-1)?.key ?? "other"; name = runs.at(-1)?.name ?? "Other"; }
        else {
          // Not in a repo: group by the folder itself ("~" for home).
          const dir = where.replace(/\/+$/, "");
          key = `dir:${s.machine ?? ""}:${dir}`;
          name = (dir === home().replace(/\/+$/, "") && !s.machine ? "~" : base(dir)) + (s.machine ? `@${s.machine}` : "");
        }
      }
      const last = runs.at(-1);
      if (last && last.key === key) last.rows.push({ s, i });
      else runs.push({ key, name, custom: key.startsWith("custom:"), rows: [{ s, i }] });
    });
    this.auto = auto;
    return runs;
  }

  dot(status, t, size = 6) {
    if (status === "working") return spinner(t);
    if (status === "blocked" || status === "done") return div().size(size).flex_none().rounded_full().bg(t[status]);
    return null;
  }

  // Every list row: [lead column][text…]. Agents are indented by one lead column plus the gap,
  // so an agent's icon sits under its space's name and both kinds line up.
  row(id, height, depth, lead, t) {
    return h_flex().id(id).relative().h(height).pl(PAD + depth * (LEAD + GAP)).pr(PAD + 2).gap(GAP).items_center().rounded(4)
      .hover((h) => h.bg(t.hover))
      .child(h_flex().flex_none().w(LEAD).items_center().child(lead));
  }

  spaceRow({ s, i }, t, list) {
    const on = s.active;
    return this.row(`sp-${s.id}`, 22, 0, div().text_color(on ? t.accent : t.dim).child(String(i + 1)), t)
      .when(this.pressed === s.id && this.over !== s.id, (el) => el.opacity(0.5))
      .when(this.pressed && this.over === s.id && this.pressed !== s.id, (el) =>
        el.child(div().absolute().left(0).right(0).h(2).bg(t.accent).when(this.pressedIndex < i, (l) => l.bottom(0)).when(this.pressedIndex > i, (l) => l.top(0))))
      .on_mouse_down("left", () => { this.pressed = s.id; this.pressedIndex = i; this.over = s.id; })
      .on_mouse_move((_e, cx) => {
        if (!this.pressed) return;
        const src = list.find((x) => x.id === this.pressed);
        const over = src && (src.machine ?? null) === (s.machine ?? null) ? s.id : null;
        if (this.over !== over) { this.over = over; cx.notify(); }
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed, over = this.over;
        this.pressed = null; this.over = null;
        if (from && over === s.id && from !== s.id) run("space.move", { id: from, index: i + 1 });
        else if (from === s.id) run("space.select", { id: s.id });
        cx.notify();
      })
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "my-menu", kind: "popup", width: 200, height: 290, props: { tab: "space", target: { id: s.id } } }); })
      .child(div().flex_initial().min_w(40).truncate().text_color(on ? t.accent : t.foreground).child(s.name))
      .when(Boolean(s.branch) && !["main", "master"].includes(s.branch), (el) => el.child(div().flex_initial().min_w(0).truncate().text_size(11).text_color(t.dim).child(s.branch)))
      .child(div().flex_1());
  }

  agentRow(a, t) {
    const p = a.program;
    const working = a.status === "working";
    const iconColors = { claude: "#D97757", codex: t.ansi4, opencode: t.muted };
    const icon = working ? spinner(t)
      : p?.icon ? (p.tint ? svg(p.icon).size(12).text_color(iconColors[p.key] ?? t.muted) : image(p.icon).size(12)) : null;
    const title = cleanTitle(a.title) || p?.name || a.tab_name;
    return this.row(`ag-${a.address}`, 20, 1, icon, t).text_size(12)
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .child(div().flex_1().min_w(0).truncate().text_color(working ? t.working : a.focused ? t.foreground : t.muted).child(title))
      .when(!working && Boolean(this.dot(a.status, t)), (el) => el.child(this.dot(a.status, t)));
  }

  // The header's label: how many agents need you, have finished, or are working, in their
  // status colours; empty when there's nothing to report. Plain text, so
  // the header still drags the window.
  summary(t) {
    const n = { blocked: 0, done: 0, working: 0 };
    const list = agents();
    for (const a of list) if (a.status in n) n[a.status]++;
    const parts = [
      ["blocked", "needs you"], ["done", "done"], ["working", "working"],
    ].filter(([k]) => n[k] > 0).map(([k, label]) => div().flex_none().text_color(t[k]).child(`${n[k]} ${label}`));
    const row = h_flex().flex_1().min_w(0).gap(6).items_center().overflow_hidden();
    if (!parts.length) return row;
    return row.children(parts.flatMap((p, i) => (i ? [div().flex_none().text_color(t.dim).child("·"), p] : [p])));
  }

  header(t) {
    const grouping = shared("sidebar.grouping") !== "none";
    const btn = (id, icon, tip, on, action) => div().id(id).size(20).flex().items_center().justify_center().rounded(5).tooltip(tip)
      .text_color(on ? t.accent : t.dim).hover((h) => h.bg(t.hover).text_color(t.foreground)).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(svg(`${ICON}/${icon}.svg`).size(13));
    return h_flex().size_full().bg(t.chrome).px(8).gap(2).items_center().flex_none().text_size(11.5).text_color(t.dim)
      .child(this.summary(t))
      .child(btn("toggle-group", "layers", grouping ? "Grouped by project" : "Not grouped", grouping, () => setShared("sidebar.grouping", grouping ? "none" : "project")))
      .child(btn("new-space", "plus", "New space", false, () => run("space.new")));
  }

  rail(sp, t) {
    return v_flex().id("rail").size_full().pt(6).gap(2).items_center().overflow_y_scrollbar().text_size(12.5)
      .children(sp.map((s, i) => h_flex().id(`r-${s.id}`).relative().w(32).h(26).rounded(6).justify_center().items_center()
        .hover((h) => h.bg(t.hover)).on_click(() => run("space.select", { id: s.id }))
        .child(div().text_color(s.active ? t.accent : t.muted).child(String(i + 1)))
        .when(Boolean(this.dot(s.status, t, 5)), (el) => el.child(div().absolute().top(4).right(3).child(this.dot(s.status, t, 5))))));
  }

  render(cx) {
    const t = theme();
    const sp = spaces();
    if (props()?.header) return narrow() ? div().size_full().bg(t.chrome) : this.header(t);
    if (narrow()) return this.rail(sp, t);
    const ps = panes();
    const ags = agents();
    const bySpace = {};
    for (const a of ags) (bySpace[a.space] ??= []).push(a);
    const groups = this.groups(sp, ps);
    const grouped = shared("sidebar.grouping") !== "none";
    const blocks = [];
    groups.forEach((g, gi) => {
      const rows = [];
      g.rows.forEach((r, ri) => {
        let row = this.spaceRow(r, t, sp);
        if (grouped && g.custom && ri === 0) row = row.child(div().flex_none().text_size(10.5).text_color(t.dim).child(g.name));
        rows.push(row);
        for (const a of bySpace[r.s.id] ?? []) rows.push(this.agentRow(a, t));
      });
      const line = grouped && g.key !== "other" && g.key !== "all";
      const current = g.rows.some((r) => r.s.active);
      const busy = g.rows.some((r) => (bySpace[r.s.id] ?? []).some((a) => a.status === "working"));
      const hueOf = busy ? t.working : t.accent;
      blocks.push(h_flex().id(`grp-${gi}`).items_stretch().gap(2).when(gi > 0 && grouped, (el) => el.mt(4))
        .child(div().w(2).flex_none().rounded(2).my(2).bg(!line ? t.chrome : current ? hueOf : faded(hueOf)))
        .child(v_flex().flex_1().min_w(0).gap(1).children(rows)));
    });
    return v_flex().size_full().min_h(0).bg(t.chrome).text_size(13)
      .on_mouse_up("left", (_e, cx) => { if (this.pressed) { this.pressed = null; this.over = null; cx.notify(); } })
      .child(v_flex().id("list").flex_1().min_h(0).px(2).pb(4).gap(0).overflow_y_scrollbar().children(blocks));
  }
}
