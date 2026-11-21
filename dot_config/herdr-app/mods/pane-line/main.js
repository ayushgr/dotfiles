// A 2px line along the top of each pane in a split, centred and 90% of the pane's width:
// the theme's foreground on the focused pane, nothing on the others. Used as the tab's
// pane header.
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, theme } from "herdr";

// 5% · 90% · 5%: shares of the width (each part starts at 0 and grows by its share).
const part = (share) => div().w(0).flex_grow(share).h_full();

export default class PaneLine extends View {
  render() {
    const t = theme();
    const me = panes().find((p) => p.pane === props()?.pane);
    return h_flex().size_full().bg(t.background)
      .child(part(1))
      .child(part(18).when(Boolean(me?.focused), (el) => el.bg(t.foreground)))
      .child(part(1));
  }
}
