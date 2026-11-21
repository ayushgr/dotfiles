// "Move to group…" for one space (props().space): pick a named group, type a new one,
// or go back to its repo's group. Writes shared "sidebar.groups" { spaceId: name }.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, closeOverlay, shared, setShared, spaces, theme } from "herdr";

export default class GroupPicker extends View {
  init(_props, cx) {
    this.input = InputState.new({ value: "", placeholder: "New group name" });
    this.input.on("submit", () => { const v = this.input.value().trim(); if (v) this.pick(v); });
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    this.handle = cx.focus_handle();
  }
  pick(name) {
    const id = props()?.space;
    const g = { ...(shared("sidebar.groups") ?? {}) };
    if (name) g[id] = name; else delete g[id];
    setShared("sidebar.groups", g);
    closeOverlay(props()?.overlay);
  }
  render() {
    const t = theme();
    const id = props()?.space;
    const g = shared("sidebar.groups") ?? {};
    const auto = shared("sidebar.auto") ?? {};
    const names = [...new Set([...Object.values(g), ...Object.values(auto)])].sort((a, b) => a.localeCompare(b));
    const space = spaces().find((s) => s.id === id);
    const item = (key, label, current, action) => h_flex().id(key).h(26).px(8).rounded(6).items_center().cursor_pointer()
      .text_color(current ? t.accent : t.foreground).hover((h) => h.bg(t.hover)).on_click(action).child(label);
    return v_flex().id("group-picker").track_focus(this.handle)
      .on_key_down((e, cx) => { if (e.key === "escape") { closeOverlay(props()?.overlay); cx.stop_propagation(); } })
      .size_full().p(10).gap(4).bg(t.popover).text_size(12.5).text_color(t.foreground)
      .child(div().pb(4).text_size(11.5).text_color(t.dim).child(`Group for ${space?.name ?? "space"}`))
      .child(Input.new(this.input).h(30).px(8).rounded(6).border_1().border_color(t.input).bg(t.background))
      .child(v_flex().id("names").flex_1().min_h(0).overflow_y_scrollbar()
        .child(item("auto", auto[id] ? `Auto (repo: ${auto[id]})` : "Auto (by repo)", !g[id], () => this.pick(null)))
        .children(names.map((n, i) => item(`n${i}`, n, g[id] === n, () => this.pick(n)))));
  }
}
