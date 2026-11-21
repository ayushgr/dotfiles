// Focus the prev pane in the shown tab, wrapping around (old herdr cycle_pane_prev).
// Bound in keys.json via mod.open:pane-prev; opens as an invisible popup, acts, closes.
import { View, div } from "gpui-kit";
import { panes, focused, run, props, closeOverlay, checking } from "herdr";

const STEP = -1;

export default class PaneCycle extends View {
  init() {
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
    if (checking()) return;
    const f = focused();
    if (!f) return;
    const list = panes().filter((p) => p.tab === f.tab);
    if (list.length < 2) return;
    const i = list.findIndex((p) => p.focused);
    const next = list[(i + STEP + list.length) % list.length];
    if (list.some((p) => p.zoomed)) run("pane.zoom", { pane: next.pane });
    else run("pane.focus", { pane: next.pane });
  }
  render() { return div(); }
}
