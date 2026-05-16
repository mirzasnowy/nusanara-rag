/**
 * frontend/lib/log.js
 *
 * Dev-only logger. `log` dan `debug` jadi no-op di production build
 * (Next.js inline `process.env.NODE_ENV` di build-time, dead code eliminated).
 *
 * `warn` dan `error` tetap aktif di production — untuk diagnosa masalah nyata.
 *
 * Jangan log PII (email, narrative, JWT, response body penuh) bahkan via log/debug
 * kecuali kamu tahu user tidak akan share screenshot console.
 */

const isDev = process.env.NODE_ENV !== 'production'

export const log = isDev ? console.log.bind(console) : () => {}
export const debug = isDev ? console.debug.bind(console) : () => {}
export const warn = console.warn.bind(console)
export const error = console.error.bind(console)
export { isDev }
