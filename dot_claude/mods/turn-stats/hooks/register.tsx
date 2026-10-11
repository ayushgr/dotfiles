import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Stats } from '../types'

const CYCLE = '(shift+tab to cycle)'
const EMPTY: Stats = { ms: 0, tools: 0 }

const stats = atom({ plugin: 'turn-stats', key: 'stats' } as const, EMPTY)

// 42 sec, 4 min, 1 hr 12 min
export const duration = (ms: number): string => {
  const s = Math.round(ms / 1000)

  if (s < 60) {
    return `${s} sec`
  }

  const m = Math.round(s / 60)

  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`
}

// 4 min · 80 tools: the time the model has worked and the tools it has called.
export const summary = ({ ms, tools }: Stats): string =>
  ms === 0 && tools === 0 ? '' : `${duration(ms)} · ${tools} tool${tools === 1 ? '' : 's'}`

export const register: Register = on => {
  // Tool calls of the main loop's turn under way.
  let tools = 0

  on('turn.start', ($, e, next) => {
    tools = 0

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    if (e.agentId === undefined) {
      tools += 1
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // A subagent's turns are part of the main turn that spawned it.
    if (e.agentId === undefined) {
      const turn = { ms: e.durationMs, tools }
      await update($, stats, s => ({ ms: s.ms + turn.ms, tools: s.tools + turn.tools }))
    }

    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const { hint } = e.props
    const rest = hint.replace(CYCLE, '').replace(/\s+/g, ' ').trim()

    // The line says something else (a mode as it changes, a hint while
    // working): kept, less the cycle hint.
    if (rest !== '') {
      return rest === hint ? next(e) : next({ ...e, props: { ...e.props, hint: rest } })
    }

    const { Text } = $.ui.resolve(e)

    return <Text dimColor>{summary(await read($, stats)) || ' '}</Text>
  })
}
