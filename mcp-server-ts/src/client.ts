const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8080'

export interface ApiResponse {
  success: boolean
  timestamp?: number
  data?: Record<string, unknown>
  error?: string
  _binary?: string
}

export async function callPythonApi(action: string, params: Record<string, unknown> = {}): Promise<ApiResponse> {
  const body = { action, ...params }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = process.env.AUTH_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${PYTHON_API_URL}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    }
  }

  return response.json()
}

export async function callPythonApiAction(action: string, params: Record<string, unknown> = {}): Promise<ApiResponse> {
  return callPythonApi(action, params)
}
