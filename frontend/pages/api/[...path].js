export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

function getBackendBase() {
  return (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function copyRequestHeaders(req) {
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue
    if (value === undefined) continue
    headers[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return headers
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
    res.setHeader(key, value)
  })
}

async function writeUpstreamBody(upstream, res) {
  if (!upstream.body) {
    res.end()
    return
  }

  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}

export default async function handler(req, res) {
  const backendBase = getBackendBase()
  if (!backendBase) {
    res.status(500).json({
      detail: 'BACKEND_INTERNAL_URL atau NEXT_PUBLIC_API_URL belum diset di Vercel.',
    })
    return
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
  const target = new URL(`/api/${path || ''}`, backendBase)
  if (req.url.includes('?')) {
    target.search = req.url.slice(req.url.indexOf('?') + 1)
  }

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req)
    const upstream = await fetch(target, {
      method: req.method,
      headers: copyRequestHeaders(req),
      body: body?.length ? body : undefined,
      redirect: 'manual',
    })

    res.status(upstream.status)
    copyResponseHeaders(upstream, res)
    await writeUpstreamBody(upstream, res)
  } catch (e) {
    res.status(502).json({
      detail: `Proxy gagal menghubungi backend: ${e.message}`,
    })
  }
}
