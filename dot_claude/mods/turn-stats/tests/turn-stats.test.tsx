import { expect, test } from 'claude-code/testing'

import { duration, summary } from '../hooks/register'

const props = (hint: string) => ({ hint, isDraft: false, isWorking: false })

test('durations read short', () => {
  expect(duration(42_400)).toBe('42 sec')
  expect(duration(250_000)).toBe('4 min')
  expect(duration(4_320_000)).toBe('1 hr 12 min')
})

test('the summary is the session\'s model time and tool calls', () => {
  expect(summary({ ms: 0, tools: 0 })).toBe('')
  expect(summary({ ms: 250_000, tools: 80 })).toBe('4 min · 80 tools')
  expect(summary({ ms: 5_000, tools: 1 })).toBe('5 sec · 1 tool')
})

test('the cycle hint gives way to the summary; other hints stay', async ($, on) => {
  // Stands in for the engine: draws the hint it is handed.
  on('ui.render', { component: 'PromptHint' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.hint}</Text>
  })

  const ui = await $.ui.mount({
    plugin: 'turn-stats',
    surface: 'terminal',
    component: 'PromptHint',
    props: props('(shift+tab to cycle)'),
  })
  const text = async () => JSON.parse(JSON.stringify(await ui.drawn())).children?.[0] ?? ''
  expect(await text()).toBe(' ')

  await ui.redraw(props('plan mode on (shift+tab to cycle)'))
  expect(await text()).toBe('plan mode on')

  await ui.redraw(props('esc to interrupt'))
  expect(await text()).toBe('esc to interrupt')
})
