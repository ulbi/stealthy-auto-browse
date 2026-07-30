import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const TS_MCP_URL = process.env.TS_MCP_URL || 'http://localhost:8081/mcp/ts'
const PY_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8080'
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-token'

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ❌ ${name}: ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

async function withTimeout(promise, ms, label) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) =>
        ac.signal.addEventListener('abort', () => reject(new Error(`Timeout: ${label}`)))
      ),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  console.log('========================================')
  console.log('  Integration Tests: TS MCP -> Python API')
  console.log('========================================')

  // 1. Python API health
  await test('Python API health', async () => {
    const resp = await fetch(`${PY_API_URL}/health`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    })
    assert(resp.ok, `Health check failed: ${resp.status}`)
    const text = await resp.text()
    assert(text === 'ok', `Unexpected health response: ${text}`)
  })

  // 2. Create and connect MCP client
  const client = new Client({
    name: 'integration-test-client',
    version: '1.0.0',
  })

  const transport = new StreamableHTTPClientTransport(new URL(TS_MCP_URL))

  await test('MCP connect', async () => {
    await withTimeout(client.connect(transport), 15000, 'MCP connect')
  })

  // 3. List tools
  await test('MCP list tools', async () => {
    const tools = await withTimeout(client.listTools(), 10000, 'listTools')
    const count = tools.tools.length
    assert(count >= 20, `Expected >=20 tools, got ${count}`)

    const toolNames = tools.tools.map(t => t.name)
    const required = [
      'navigate', 'click', 'system_click', 'get_text', 'get_html',
      'screenshot', 'ping', 'run_script', 'fill', 'scroll',
      'system_type', 'send_key', 'mouse_move', 'eval_js',
    ]
    for (const name of required) {
      assert(toolNames.includes(name), `Required tool '${name}' not found`)
    }
    console.log(`    ${count} tools, all required tools present`)
  })

  // 4. Ping
  await test('MCP ping', async () => {
    const result = await withTimeout(client.callTool({ name: 'ping', arguments: {} }), 10000, 'ping')
    assert(!result.isError, `Ping failed: ${JSON.stringify(result)}`)
  })

  // 5. Navigate
  await test('MCP navigate', async () => {
    const result = await withTimeout(
      client.callTool({ name: 'navigate', arguments: { url: 'https://example.com' } }),
      30000, 'navigate'
    )
    assert(!result.isError, `Navigate failed: ${JSON.stringify(result)}`)
  })

  // 6. Get text
  await test('MCP get_text', async () => {
    const result = await withTimeout(client.callTool({ name: 'get_text', arguments: {} }), 10000, 'get_text')
    assert(!result.isError, `get_text failed: ${JSON.stringify(result)}`)
    const text = result.content[0].text
    assert(text.includes('Example Domain'), `Expected 'Example Domain' text, got: ${text.slice(0, 100)}`)
  })

  // 7. Get HTML
  await test('MCP get_html', async () => {
    const result = await withTimeout(client.callTool({ name: 'get_html', arguments: {} }), 10000, 'get_html')
    assert(!result.isError, `get_html failed: ${JSON.stringify(result)}`)
    const text = result.content[0].text
    assert(text.includes('html'), `Expected HTML content, got: ${text.slice(0, 100)}`)
  })

  // 8. Run script
  await test('MCP run_script', async () => {
    const result = await withTimeout(
      client.callTool({ name: 'run_script', arguments: {
        steps: [{ action: 'goto', url: 'https://example.com' }, { action: 'get_text', output_id: 'text' }],
        on_error: 'stop',
      }}),
      30000, 'run_script'
    )
    assert(!result.isError, `run_script failed: ${JSON.stringify(result)}`)
    const text = result.content[0].text
    assert(text.includes('steps_executed'), `Expected steps_executed in: ${text.slice(0, 100)}`)
  })

  // 9. Eval JS
  await test('MCP eval_js', async () => {
    const result = await withTimeout(
      client.callTool({ name: 'eval_js', arguments: { expression: 'document.title' } }),
      10000, 'eval_js'
    )
    assert(!result.isError, `eval_js failed: ${JSON.stringify(result)}`)
    const text = result.content[0].text
    assert(text.includes('Example Domain'), `Expected 'Example Domain', got: ${text.slice(0, 100)}`)
  })

  // 10. Screenshot
  await test('MCP screenshot', async () => {
    const result = await withTimeout(
      client.callTool({ name: 'screenshot', arguments: { whLargest: 512 } }),
      15000, 'screenshot'
    )
    assert(!result.isError, `Screenshot failed: ${JSON.stringify(result)}`)
  })

  // 11. System click
  await test('MCP calibrate', async () => {
    const result = await withTimeout(
      client.callTool({ name: 'calibrate', arguments: {} }),
      10000, 'calibrate'
    )
    assert(!result.isError, `calibrate failed: ${JSON.stringify(result)}`)
    const text = result.content[0].text
    assert(text.includes('window_offset'), `Expected window_offset in: ${text.slice(0, 100)}`)
  })

  await client.close()

  console.log('')
  console.log('========================================')
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log('========================================')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
