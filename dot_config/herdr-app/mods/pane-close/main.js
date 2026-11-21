// cmd-w: close the focused pane without asking. pane.close on a tab's only pane
// would ask "Close space?" when it's the last tab, so close that tab confirmed instead.
import { View, div } from "gpui-kit";
import { panes, focused, run, props, closeOverlay, checking } from "herdr";

export default class PaneClose extends View {
  init() {
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
    if (checking()) return;
    const f = focused();
    if (!f?.pane) return run("pane.close", {});
    const alone = panes().filter((p) => p.tab === f.tab).length === 1;
    if (alone) run("tab.close", { id: f.tab, confirmed: true });
    else run("pane.close", { pane: f.pane });
  }
  render() { return div(); }
}
