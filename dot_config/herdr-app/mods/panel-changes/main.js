// Toggle the Changes panel on the right (bound in keys.json), then close.
import { View, div } from "gpui-kit";
import { layout, run, props, closeOverlay, checking } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const c of node?.children ?? []) { const f = find(c, id); if (f) return f; }
  return null;
}

export default class PanelToggle extends View {
  init() {
    const o = props()?.overlay; if (o) closeOverlay(o);
    if (checking()) return;
    const root = layout(), panel = find(root, "panel"), body = find(root, "panel-body");
    if (!panel) return;
    if (!panel.hidden && body?.active === "changes") run("layout.hide", { id: "panel" });
    else { run("layout.select", { stack: "panel-body", child: "changes" }); run("layout.show", { id: "panel" }); }
  }
  render() { return div(); }
}
