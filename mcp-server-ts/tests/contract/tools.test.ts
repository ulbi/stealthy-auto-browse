import { describe, it, expect } from 'vitest'
import { TOOL_DEFINITIONS, getToolNames } from '../../src/schema.js'

describe('MCP Tool Contract', () => {
  it('exposes all required navigation tools', () => {
    const names = getToolNames()
    expect(names).toContain('navigate')
    expect(names).toContain('refresh')
  })

  it('exposes all required content tools', () => {
    const names = getToolNames()
    expect(names).toContain('get_text')
    expect(names).toContain('get_html')
    expect(names).toContain('get_page_info')
    expect(names).toContain('get_element')
    expect(names).toContain('get_elements')
    expect(names).toContain('get_interactive_elements')
    expect(names).toContain('eval_js')
  })

  it('exposes all required interaction tools (Playwright)', () => {
    const names = getToolNames()
    expect(names).toContain('click')
    expect(names).toContain('fill')
    expect(names).toContain('type')
    expect(names).toContain('wait_for_element')
    expect(names).toContain('wait_for_text')
  })

  it('exposes all required OS-level input tools (PyAutoGUI)', () => {
    const names = getToolNames()
    expect(names).toContain('system_click')
    expect(names).toContain('system_type')
    expect(names).toContain('send_key')
    expect(names).toContain('mouse_move')
    expect(names).toContain('scroll')
    expect(names).toContain('calibrate')
  })

  it('exposes screenshot tool', () => {
    expect(getToolNames()).toContain('screenshot')
  })

  it('exposes run_script for atomic multi-step workflows', () => {
    expect(getToolNames()).toContain('run_script')
  })

  it('navigate tool has correct required params', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'navigate')!
    expect(tool.inputSchema.shape).toHaveProperty('url')
    expect(tool.inputSchema.shape).toHaveProperty('wait_until')
    // url is required, wait_until has default
    expect(tool.inputSchema.safeParse({ url: 'https://example.com' }).success).toBe(true)
    expect(tool.inputSchema.safeParse({}).success).toBe(false)
  })

  it('system_click tool has x,y as numbers', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'system_click')!
    expect(tool.inputSchema.shape).toHaveProperty('x')
    expect(tool.inputSchema.shape).toHaveProperty('y')
    expect(tool.inputSchema.safeParse({ x: 100, y: 200 }).success).toBe(true)
    expect(tool.inputSchema.safeParse({ x: 'abc', y: 200 }).success).toBe(false)
  })

  it('run_script tool accepts steps array', () => {
    const tool = TOOL_DEFINITIONS.find(t => t.name === 'run_script')!
    const result = tool.inputSchema.safeParse({
      steps: [
        { action: 'goto', url: 'https://example.com' },
        { action: 'get_text', output_id: 'text' },
      ],
      name: 'test',
      on_error: 'stop',
    })
    expect(result.success).toBe(true)
  })

  it('every tool has a description', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description).toBeTruthy()
    }
  })

  it('every tool belongs to a category', () => {
    const validCategories = ['navigation', 'interaction', 'input', 'content', 'tabs', 'cookies', 'utility', 'screenshots', 'recording']
    for (const tool of TOOL_DEFINITIONS) {
      expect(validCategories).toContain(tool.category)
    }
  })

  it('at least 20 tools are defined', () => {
    expect(TOOL_DEFINITIONS.length).toBeGreaterThanOrEqual(20)
  })

  it('tool names use snake_case (match Python API)', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toMatch(/^[a-z_]+$/)
    }
  })
})
