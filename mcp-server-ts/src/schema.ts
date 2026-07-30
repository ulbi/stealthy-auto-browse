import { z } from 'zod'

export const NavigateSchema = z.object({
  url: z.string().describe('Target URL'),
  wait_until: z.enum(['load', 'domcontentloaded', 'networkidle']).default('domcontentloaded').describe('Navigation wait condition'),
  referer: z.string().optional().describe('HTTP Referer header'),
})

export const ClickSchema = z.object({
  selector: z.string().describe('CSS selector or XPath'),
})

export const SystemClickSchema = z.object({
  x: z.number().describe('Viewport X coordinate'),
  y: z.number().describe('Viewport Y coordinate'),
  duration: z.number().optional().describe('Mouse movement time in seconds'),
})

export const FillSchema = z.object({
  selector: z.string().describe('CSS selector of input element'),
  value: z.string().describe('Value to set'),
})

export const TypeSchema = z.object({
  selector: z.string().describe('CSS selector of input element'),
  text: z.string().describe('Text to type'),
  delay: z.number().default(0.05).describe('Delay between keys in seconds'),
})

export const SystemTypeSchema = z.object({
  text: z.string().describe('Text to type'),
  interval: z.number().default(0.08).describe('Average delay between keys'),
})

export const MouseMoveSchema = z.object({
  x: z.number().describe('Viewport X coordinate'),
  y: z.number().describe('Viewport Y coordinate'),
  duration: z.number().optional().describe('Movement time in seconds'),
})

export const ScrollSchema = z.object({
  amount: z.number().default(-3).describe('Scroll amount. Negative=down'),
  x: z.number().optional().describe('X coordinate'),
  y: z.number().optional().describe('Y coordinate'),
})

export const EvalSchema = z.object({
  expression: z.string().describe('JavaScript expression'),
})

export const SendKeySchema = z.object({
  key: z.string().describe('Key name or combo'),
})

export const ScreenshotSchema = z.object({
  type: z.enum(['browser', 'desktop']).default('browser').describe('Screenshot type'),
  width: z.number().optional().describe('Resize width'),
  height: z.number().optional().describe('Resize height'),
  whLargest: z.number().optional().describe('Resize largest dimension'),
})

export const GetTextSchema = z.object({}).describe('Get visible text from page')

export const GetHtmlSchema = z.object({}).describe('Get full HTML source')

export const GetElementSchema = z.object({
  selector: z.string().describe('CSS selector'),
})

export const GetElementsSchema = z.object({
  selector: z.string().describe('CSS selector'),
  limit: z.number().min(1).max(100).default(20).describe('Element limit'),
})

export const GetPageInfoSchema = z.object({}).describe('Get page URL, title, viewport, etc.')

export const GetInteractiveElementsSchema = z.object({
  visible_only: z.boolean().default(true).describe('Only viewport-visible elements'),
})

export const WaitForElementSchema = z.object({
  selector: z.string().describe('CSS selector'),
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).default('visible'),
  timeout: z.number().default(30).describe('Max wait in seconds'),
})

export const WaitForTextSchema = z.object({
  text: z.string().describe('Text to wait for'),
  timeout: z.number().default(30).describe('Max wait in seconds'),
})

export const RunScriptSchema = z.object({
  steps: z.array(z.record(z.any())).describe('List of action steps'),
  name: z.string().default('mcp_script').describe('Script name'),
  on_error: z.enum(['stop', 'continue']).default('stop').describe('Error handling'),
})

export const TabManagementSchema = z.object({
  action: z.enum(['list_tabs', 'new_tab', 'switch_tab', 'close_tab']).describe('Tab action'),
  index: z.number().optional().describe('Tab index'),
  url: z.string().optional().describe('URL for new tab'),
})

export const CookieManagementSchema = z.object({
  action: z.enum(['get_cookies', 'set_cookie', 'delete_cookies']).describe('Cookie action'),
  name: z.string().optional().describe('Cookie name'),
  value: z.string().optional().describe('Cookie value'),
  url: z.string().optional().describe('Cookie URL'),
})

export const RecordingSchema = z.object({
  action: z.enum(['start_recording', 'stop_recording', 'recording_status']).describe('Recording action'),
  mode: z.enum(['window', 'viewport', 'desktop']).optional().describe('Recording mode'),
  fps: z.number().optional().describe('Frames per second'),
  slug: z.string().optional().describe('Recording slug'),
})

export const CalibrateSchema = z.object({}).describe('Calibrate window offset for system_click')

export const PingSchema = z.object({}).describe('Health check')

export type NavigateParams = z.infer<typeof NavigateSchema>
export type ClickParams = z.infer<typeof ClickSchema>
export type SystemClickParams = z.infer<typeof SystemClickSchema>
export type FillParams = z.infer<typeof FillSchema>
export type TypeParams = z.infer<typeof TypeSchema>
export type SystemTypeParams = z.infer<typeof SystemTypeSchema>
export type MouseMoveParams = z.infer<typeof MouseMoveSchema>
export type ScrollParams = z.infer<typeof ScrollSchema>
export type EvalParams = z.infer<typeof EvalSchema>
export type SendKeyParams = z.infer<typeof SendKeySchema>
export type ScreenshotParams = z.infer<typeof ScreenshotSchema>
export type GetTextParams = z.infer<typeof GetTextSchema>
export type GetHtmlParams = z.infer<typeof GetHtmlSchema>
export type GetElementParams = z.infer<typeof GetElementSchema>
export type GetElementsParams = z.infer<typeof GetElementsSchema>
export type GetPageInfoParams = z.infer<typeof GetPageInfoSchema>
export type GetInteractiveElementsParams = z.infer<typeof GetInteractiveElementsSchema>
export type WaitForElementParams = z.infer<typeof WaitForElementSchema>
export type WaitForTextParams = z.infer<typeof WaitForTextSchema>
export type RunScriptParams = z.infer<typeof RunScriptSchema>

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: z.ZodObject<any>
  category: 'navigation' | 'interaction' | 'input' | 'content' | 'tabs' | 'cookies' | 'utility' | 'screenshots' | 'recording'
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Navigation
  { name: 'navigate', description: 'Navigate the browser to a URL', inputSchema: NavigateSchema, category: 'navigation' },
  { name: 'refresh', description: 'Reload current page', inputSchema: z.object({ wait_until: z.enum(['load', 'domcontentloaded', 'networkidle']).default('domcontentloaded') }), category: 'navigation' },

  // Content
  { name: 'get_text', description: 'Get all visible text content from the current page', inputSchema: GetTextSchema, category: 'content' },
  { name: 'get_html', description: 'Get full HTML source of the current page', inputSchema: GetHtmlSchema, category: 'content' },
  { name: 'get_page_info', description: 'Get current URL, title, viewport, and scroll info', inputSchema: GetPageInfoSchema, category: 'content' },
  { name: 'get_element', description: 'Get one element by CSS selector', inputSchema: GetElementSchema, category: 'content' },
  { name: 'get_elements', description: 'Get a bounded list of matching elements', inputSchema: GetElementsSchema, category: 'content' },
  { name: 'get_interactive_elements', description: 'Find all interactive elements on the page', inputSchema: GetInteractiveElementsSchema, category: 'content' },
  { name: 'eval_js', description: 'Execute JavaScript in the page context', inputSchema: EvalSchema, category: 'content' },

  // Interaction (Playwright)
  { name: 'click', description: 'Click element by CSS selector', inputSchema: ClickSchema, category: 'interaction' },
  { name: 'fill', description: 'Set input field value instantly', inputSchema: FillSchema, category: 'interaction' },
  { name: 'type', description: 'Type into element with per-key delay', inputSchema: TypeSchema, category: 'interaction' },
  { name: 'wait_for_element', description: 'Wait for element to reach a state', inputSchema: WaitForElementSchema, category: 'interaction' },
  { name: 'wait_for_text', description: 'Wait for text to appear', inputSchema: WaitForTextSchema, category: 'interaction' },

  // Interaction (OS-level / PyAutoGUI)
  { name: 'system_click', description: 'Click at viewport coordinates using OS-level mouse', inputSchema: SystemClickSchema, category: 'input' },
  { name: 'system_type', description: 'Type text with real OS-level keystrokes', inputSchema: SystemTypeSchema, category: 'input' },
  { name: 'send_key', description: 'Send keyboard key or combo', inputSchema: SendKeySchema, category: 'input' },
  { name: 'mouse_move', description: 'Move mouse to viewport coordinates', inputSchema: MouseMoveSchema, category: 'input' },
  { name: 'scroll', description: 'Scroll using mouse wheel', inputSchema: ScrollSchema, category: 'input' },
  { name: 'calibrate', description: 'Calibrate window offset for system_click', inputSchema: CalibrateSchema, category: 'input' },

  // Screenshots
  { name: 'screenshot', description: 'Take a screenshot of the browser viewport or full desktop', inputSchema: ScreenshotSchema, category: 'screenshots' },

  // Scripts
  { name: 'run_script', description: 'Run multiple browser actions as a single atomic script', inputSchema: RunScriptSchema, category: 'utility' },

  // Utility
  { name: 'ping', description: 'Health check', inputSchema: PingSchema, category: 'utility' },
]

export function getToolNames(): string[] {
  return TOOL_DEFINITIONS.map(t => t.name)
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find(t => t.name === name)
}
