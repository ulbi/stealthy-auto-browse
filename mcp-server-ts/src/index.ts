import crypto from 'node:crypto'
globalThis.crypto = crypto as any

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { callPythonApi } from './client.js'

const PORT = parseInt(process.env.PORT || '8081', 10)
const LOG_PREFIX = '[TS-MCP]'

function createServer(): McpServer {
  const server = new McpServer({
    name: 'stealthy-auto-browse-ts',
    version: '3.0.0',
  })

  // ==================== NAVIGATION ====================

  server.registerTool('navigate', {
    description: 'Navigate the browser to a URL',
    inputSchema: {
      url: z.string().describe('Target URL'),
      wait_until: z.enum(['load', 'domcontentloaded', 'networkidle']).default('domcontentloaded').describe('Navigation wait condition'),
      referer: z.string().optional().describe('HTTP Referer header'),
    },
  }, async (args) => {
    return await proxyTool('goto', args)
  })

  server.registerTool('refresh', {
    description: 'Reload current page',
    inputSchema: {
      wait_until: z.enum(['load', 'domcontentloaded', 'networkidle']).default('domcontentloaded'),
    },
  }, async (args) => {
    return await proxyTool('refresh', args)
  })

  // ==================== PAGE CONTENT ====================

  server.registerTool('get_text', {
    description: 'Get all visible text content from the current page',
    inputSchema: {},
  }, async () => {
    return await proxyTool('get_text', {})
  })

  server.registerTool('get_html', {
    description: 'Get full HTML source of the current page',
    inputSchema: {},
  }, async () => {
    return await proxyTool('get_html', {})
  })

  server.registerTool('get_page_info', {
    description: 'Get current URL, title, viewport, and scroll info',
    inputSchema: {},
  }, async () => {
    return await proxyTool('get_page_info', {})
  })

  server.registerTool('get_element', {
    description: 'Get one element by CSS selector',
    inputSchema: {
      selector: z.string().describe('CSS selector'),
    },
  }, async (args) => {
    return await proxyTool('get_element', args)
  })

  server.registerTool('get_elements', {
    description: 'Get a bounded list of matching elements',
    inputSchema: {
      selector: z.string().describe('CSS selector'),
      limit: z.number().min(1).max(100).default(20).describe('Element limit'),
    },
  }, async (args) => {
    return await proxyTool('get_elements', args)
  })

  server.registerTool('get_interactive_elements', {
    description: 'Find all interactive elements on the page (buttons, links, inputs)',
    inputSchema: {
      visible_only: z.boolean().default(true).describe('Only viewport-visible elements'),
    },
  }, async (args) => {
    return await proxyTool('get_interactive_elements', args)
  })

  server.registerTool('eval_js', {
    description: 'Execute JavaScript in the page context and return the result',
    inputSchema: {
      expression: z.string().describe('JavaScript expression to evaluate'),
    },
  }, async (args) => {
    return await proxyTool('eval', args)
  })

  // ==================== INTERACTION (Playwright) ====================

  server.registerTool('click', {
    description: 'Click element by CSS selector or XPath. PREFER THIS over system_click.',
    inputSchema: {
      selector: z.string().describe('CSS selector or "xpath=..." expression'),
    },
  }, async (args) => {
    return await proxyTool('click', args)
  })

  server.registerTool('fill', {
    description: 'Set input field value instantly by CSS selector (clears first, no keystrokes)',
    inputSchema: {
      selector: z.string().describe('CSS selector of the input element'),
      value: z.string().describe('Value to set'),
    },
  }, async (args) => {
    return await proxyTool('fill', args)
  })

  server.registerTool('type', {
    description: 'Type into element with per-key delay (generates keystroke events)',
    inputSchema: {
      selector: z.string().describe('CSS selector of input element'),
      text: z.string().describe('Text to type'),
      delay: z.number().default(0.05).describe('Delay between keys in seconds'),
    },
  }, async (args) => {
    return await proxyTool('type', args)
  })

  server.registerTool('wait_for_element', {
    description: 'Wait for element to reach a state',
    inputSchema: {
      selector: z.string().describe('CSS selector or XPath'),
      state: z.enum(['visible', 'hidden', 'attached', 'detached']).default('visible'),
      timeout: z.number().default(30).describe('Max wait in seconds'),
    },
  }, async (args) => {
    return await proxyTool('wait_for_element', args)
  })

  server.registerTool('wait_for_text', {
    description: 'Wait for specific text to appear anywhere on the page',
    inputSchema: {
      text: z.string().describe('Substring to wait for'),
      timeout: z.number().default(30).describe('Max wait in seconds'),
    },
  }, async (args) => {
    return await proxyTool('wait_for_text', args)
  })

  // ==================== OS-LEVEL INPUT (PyAutoGUI) ====================

  server.registerTool('system_click', {
    description: 'Click at viewport coordinates using real OS-level mouse. Call calibrate() first.',
    inputSchema: {
      x: z.number().describe('Viewport X coordinate'),
      y: z.number().describe('Viewport Y coordinate'),
      duration: z.number().optional().describe('Mouse movement time in seconds'),
    },
  }, async (args) => {
    return await proxyTool('system_click', args)
  })

  server.registerTool('system_type', {
    description: 'Type text with real OS-level keystrokes (undetectable by bot detection)',
    inputSchema: {
      text: z.string().describe('Text to type'),
      interval: z.number().default(0.08).describe('Average delay between keystrokes in seconds'),
    },
  }, async (args) => {
    return await proxyTool('system_type', args)
  })

  server.registerTool('send_key', {
    description: 'Send keyboard key or combo (e.g. "enter", "ctrl+a", "escape")',
    inputSchema: {
      key: z.string().describe('Key name or combo using PyAutoGUI key names'),
    },
  }, async (args) => {
    return await proxyTool('send_key', args)
  })

  server.registerTool('mouse_move', {
    description: 'Move mouse to viewport coordinates with human-like movement (no click)',
    inputSchema: {
      x: z.number().describe('Viewport X coordinate'),
      y: z.number().describe('Viewport Y coordinate'),
      duration: z.number().optional().describe('Movement time in seconds'),
    },
  }, async (args) => {
    return await proxyTool('mouse_move', args)
  })

  server.registerTool('scroll', {
    description: 'Scroll using mouse wheel',
    inputSchema: {
      amount: z.number().default(-3).describe('Scroll amount. Negative=down, positive=up'),
      x: z.number().optional().describe('X coordinate to move to before scrolling'),
      y: z.number().optional().describe('Y coordinate to move to before scrolling'),
    },
  }, async (args) => {
    return await proxyTool('scroll', args)
  })

  server.registerTool('calibrate', {
    description: 'Detect browser window offset for system_click coordinates',
    inputSchema: {},
  }, async () => {
    return await proxyTool('calibrate', {})
  })

  // ==================== SCREENSHOTS ====================

  server.registerTool('screenshot', {
    description: 'Take a screenshot. LAST RESORT — prefer get_text() or get_html() instead.',
    inputSchema: {
      type: z.enum(['browser', 'desktop']).default('browser').describe('Screenshot type'),
      width: z.number().optional().describe('Resize width'),
      height: z.number().optional().describe('Resize height'),
      whLargest: z.number().optional().describe('Resize largest dimension to this. Use 512 for LLMs.'),
    },
  }, async (args) => {
    return await proxyTool('save_screenshot', args)
  })

  // ==================== SCRIPTS ====================

  server.registerTool('run_script', {
    description: 'Run multiple browser actions as a single atomic script',
    inputSchema: {
      steps: z.array(z.record(z.any())).describe('List of action steps'),
      name: z.string().default('mcp_script').describe('Script name'),
      on_error: z.enum(['stop', 'continue']).default('stop').describe('Error handling'),
    },
  }, async (args) => {
    return await proxyTool('run_script', args)
  })

  // ==================== UTILITY ====================

  server.registerTool('ping', {
    description: 'Health check. Returns current URL.',
    inputSchema: {},
  }, async () => {
    return await proxyTool('ping', {})
  })

  server.registerTool('browser_action', {
    description: 'Execute any browser action not covered by the other tools (cookies, tabs, storage, etc.)',
    inputSchema: {
      action: z.string().describe('Action name (e.g. "get_cookies", "new_tab", "start_recording")'),
      params: z.record(z.any()).optional().describe('Optional action parameters'),
    },
  }, async (args) => {
    const actionName = args.action as string
    const params = (args.params as Record<string, unknown>) || {}
    return await proxyTool(actionName, params)
  })

  return server
}

async function proxyTool(action: string, params: Record<string, unknown>): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    const result = await callPythonApi(action, params)
    if (!result.success) {
      return {
        content: [{ type: 'text', text: result.error || 'Unknown error' }],
        isError: true,
      }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result.data || result) }],
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error calling Python API: ${err}` }],
      isError: true,
    }
  }
}

// ==================== HTTP SERVER ====================

const app = new Hono()

// Request logging (NICHT c.req.text() lesen — das konsumiert den Body!)
app.use('*', async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  console.log(`${LOG_PREFIX} --> ${method} ${path}`)
  await next()
  const ms = Date.now() - start
  const status = c.res.status
  console.log(`${LOG_PREFIX} <-- ${method} ${path} ${status} ${ms}ms`)
})

// Error handler
app.onError((err, c) => {
  console.error(`${LOG_PREFIX} ERROR: ${err.message}\n${err.stack}`)
  return c.json({ error: err.message }, 500)
})

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
}))

app.get('/health', c => c.json({ status: 'ok' }))
app.get('/mcp/ts', (c) => c.status(405) as any) // Method Not Allowed (spec-compliant)

app.all('/mcp/ts', async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport()
  const server = createServer()
  await server.connect(transport)
  return transport.handleRequest(c.req.raw)
})

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`TS MCP server listening on http://0.0.0.0:${PORT}/mcp/ts`)
