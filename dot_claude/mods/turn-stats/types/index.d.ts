/** Session totals over finished main-loop turns. */
export type Stats = { ms: number; tools: number }

declare module 'claude-code' {
  interface PluginState {
    'turn-stats': { stats: Stats }
  }
}
