/**
 * frontend/lib/api.js
 *
 * Client tipis untuk backend NusaNara (FastAPI di NEXT_PUBLIC_API_URL).
 * Semua request membawa JWT Clerk via getCachedToken.
 */

import { getCachedToken } from './tokenCache'

const BASE = process.env.NEXT_PUBLIC_API_URL

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(getToken, path, init = {}) {
  const token = await getCachedToken(getToken)
  if (!token) throw new ApiError('Tidak ada token autentikasi.', 401)

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(body.detail || `Request gagal (${res.status})`, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}

export function getProfile(getToken) {
  return request(getToken, '/api/profile')
}

export function initProfile(getToken, { email, full_name }) {
  return request(getToken, '/api/profile/init', {
    method: 'POST',
    body: JSON.stringify({ email: email || '', full_name: full_name || '' }),
  })
}

/**
 * Normalize getHistory response.
 * Backend bisa return:
 *   - Array (legacy): [{...}, {...}]
 *   - Paginated: {total, page, total_pages, data: [...]}
 * Selalu return shape konsisten: {items, total, page, total_pages}
 */
export async function getHistory(getToken, { page, limit } = {}) {
  const qs = new URLSearchParams()
  if (page !== undefined) qs.set('page', String(page))
  if (limit !== undefined) qs.set('limit', String(limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const raw = await request(getToken, `/api/history${suffix}`)

  if (Array.isArray(raw)) {
    return { items: raw, total: raw.length, page: 1, total_pages: 1 }
  }
  return {
    items: Array.isArray(raw?.data) ? raw.data : [],
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    total_pages: raw?.total_pages ?? 1,
  }
}

export function getHistoryDetail(getToken, id) {
  return request(getToken, `/api/history/${id}`)
}

export { ApiError }
