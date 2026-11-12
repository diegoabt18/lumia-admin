#!/usr/bin/env node
/**
 * Verifica que shared/auth/permissions.ts coincida exactamente con el registro del Server
 * (server/src/common/permissions/registry.ts → PERMISSION_REGISTRY). Solo lectura.
 *
 * Ruta del registro configurable con SERVER_PERMISSION_REGISTRY.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const serverRegistry = process.env.SERVER_PERMISSION_REGISTRY
  ? resolve(process.env.SERVER_PERMISSION_REGISTRY)
  : resolve(root, '..', 'server', 'src', 'common', 'permissions', 'registry.ts')
const localRegistry = join(root, 'shared', 'auth', 'permissions.ts')

/** Extrae los pares CLAVE: 'valor' del primer objeto `... = { ... } as const`. */
function extractEntries(source, objectName) {
  const start = source.indexOf(`${objectName} = {`)
  if (start < 0) throw new Error(`No se encontró ${objectName}`)
  const end = source.indexOf('} as const', start)
  const body = source.slice(start, end)
  const entries = new Map()
  for (const match of body.matchAll(/([A-Z0-9_]+)\s*:\s*'([^']+)'/g)) entries.set(match[1], match[2])
  return entries
}

async function main() {
  if (!existsSync(serverRegistry)) {
    console.error(`[permissions] No se encontró el registro del Server: ${serverRegistry}`)
    process.exitCode = 1
    return
  }
  const server = extractEntries(await readFile(serverRegistry, 'utf8'), 'PERMISSION_REGISTRY')
  const local = extractEntries(await readFile(localRegistry, 'utf8'), 'PERMISSIONS')

  const problems = []
  for (const [key, value] of server) {
    if (!local.has(key)) problems.push(`falta ${key} = '${value}'`)
    else if (local.get(key) !== value) problems.push(`${key}: local '${local.get(key)}' ≠ server '${value}'`)
  }
  for (const [key, value] of local) {
    if (!server.has(key)) problems.push(`sobra ${key} = '${value}' (no existe en el Server)`)
  }

  if (problems.length) {
    console.error(`[permissions] ${problems.length} diferencia(s) con el Server:`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exitCode = 1
    return
  }
  console.log(`[permissions] OK: ${server.size} permisos coinciden con el Server`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
