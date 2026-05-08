/**
 * frontend/lib/tokenCache.js
 *
 * Cache JWT dari Clerk di MEMORY MODULE (bukan component state / sessionStorage).
 * Module scope = persist selama tab browser hidup, tidak reset saat navigasi halaman.
 *
 * Hanya panggil getToken({ template: "nusanara" }) saat:
 *   - Belum ada token tersimpan, ATAU
 *   - Token akan expire dalam < REFRESH_THRESHOLD detik
 */

let _cachedToken = null
let _cachedExp = 0

// Refresh 5 menit sebelum expire — cukup lebar untuk hindari race condition
const REFRESH_THRESHOLD_SEC = 300

/**
 * Decode base64url JWT payload tanpa library
 */
function decodeJwtExp(token) {
  try {
    const payloadB64 = token.split('.')[1]
    // base64url → base64 standar
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(b64)
    const payload = JSON.parse(json)
    return typeof payload.exp === 'number' ? payload.exp : 0
  } catch {
    return 0
  }
}

/**
 * Ambil JWT token dengan template "nusanara" menggunakan cara paling direct.
 *
 * Prioritas:
 * 1. window.Clerk.session.getToken({ template }) → langsung ke Clerk JS, PASTI pakai template
 * 2. getToken({ template }) dari useAuth() → fallback jika window.Clerk tidak tersedia (SSR)
 *
 * Kenapa window.Clerk: useAuth().getToken di Next.js Pages Router kadang fallback ke
 * session token default (60 detik) tanpa error. window.Clerk.session.getToken adalah
 * API yang lebih direct dan konsisten.
 *
 * @param {Function} getToken - dari useAuth() Clerk (fallback)
 * @returns {Promise<string|null>}
 */
export async function getCachedToken(getToken) {
  const nowSec = Math.floor(Date.now() / 1000)

  // Kembalikan cache jika masih valid dan belum mendekati expire
  if (_cachedToken && _cachedExp > nowSec + REFRESH_THRESHOLD_SEC) {
    console.debug('[tokenCache] Cache hit, expire dalam', _cachedExp - nowSec, 'detik')
    return _cachedToken
  }

  console.debug('[tokenCache] Fetching token baru dengan template nusanara...')

  let token = null

  // Cara 1: window.Clerk.session.getToken — PALING DIRECT, pasti pakai template
  if (typeof window !== 'undefined' && window.Clerk?.session) {
    try {
      token = await window.Clerk.session.getToken({ template: 'nusanara' })
      console.debug('[tokenCache] Token dari window.Clerk.session.getToken')
    } catch (e) {
      console.warn('[tokenCache] window.Clerk.session.getToken gagal:', e.message)
    }
  }

  // Cara 2: fallback ke useAuth getToken (jika window.Clerk tidak ada / SSR)
  if (!token && typeof getToken === 'function') {
    try {
      token = await getToken({ template: 'nusanara' })
      console.debug('[tokenCache] Token dari useAuth().getToken (fallback)')
    } catch (e) {
      console.warn('[tokenCache] useAuth getToken gagal:', e.message)
    }
  }

  if (!token) {
    console.warn('[tokenCache] Semua metode gagal, token null')
    return null
  }

  // Decode exp dari JWT untuk caching
  const exp = decodeJwtExp(token)
  const lifetime = exp ? exp - nowSec : 0
  _cachedToken = token
  _cachedExp = exp || nowSec + 100000

  console.debug(`[tokenCache] Token tersimpan | lifetime: ${lifetime}s | exp: ${new Date(_cachedExp * 1000).toISOString()}`)
  if (lifetime < 1000) {
    console.warn('[tokenCache] ⚠️ Lifetime token hanya', lifetime, 'detik — template mungkin belum aktif di Clerk Dashboard')
  }

  return _cachedToken
}

/**
 * Hapus cache — panggil saat user sign out
 */
export function clearTokenCache() {
  _cachedToken = null
  _cachedExp = 0
  console.debug('[tokenCache] Cache dihapus')
}
