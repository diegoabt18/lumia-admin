#!/usr/bin/env node
/**
 * Copia los contratos oficiales del Server a shared/contracts de Lumia Admin.
 *
 *   node scripts/sync-contracts.mjs           → copia (escribe) los contratos
 *   node scripts/sync-contracts.mjs --check   → no escribe; exit 1 si hay copias desviadas
 *
 * Origen: ../server/shared/contracts (o SERVER_CONTRACTS_DIR).
 * Mismo algoritmo que server/scripts/sync-contracts.mjs (copia + encabezado de "generado" +
 * limpieza de obsoletos). Este script SOLO lee el Server: nunca escribe fuera de lumia-admin.
 * El script del Server no conoce este proyecto todavía; ver docs/contracts.md.
 */
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.env.SERVER_CONTRACTS_DIR
  ? resolve(process.env.SERVER_CONTRACTS_DIR)
  : resolve(root, '..', 'server', 'shared', 'contracts')
const target = join(root, 'shared', 'contracts')

const HEADER =
  '// GENERADO por lumia-admin/scripts/sync-contracts.mjs desde server/shared/contracts.\n' +
  '// No editar este archivo: cambia el original en el servidor y vuelve a sincronizar.\n'

const checkOnly = process.argv.includes('--check')

async function main() {
  if (!existsSync(source)) {
    console.error(`[contracts] No se encontró el origen: ${source}`)
    process.exitCode = 1
    return
  }

  const files = (await readdir(source)).filter((f) => f.endsWith('.ts')).sort()
  if (!files.length) {
    console.error(`[contracts] No hay contratos en ${source}`)
    process.exitCode = 1
    return
  }

  const existing = existsSync(target) ? (await readdir(target)).filter((f) => f.endsWith('.ts')) : []
  const drift = []
  for (const file of files) {
    const want = HEADER + (await readFile(join(source, file), 'utf8'))
    const path = join(target, file)
    const have = existsSync(path) ? await readFile(path, 'utf8') : null
    if (have !== want) drift.push({ file, want })
  }
  const stale = existing.filter((f) => !files.includes(f))

  if (checkOnly) {
    console.log(`[contracts] desviados: ${drift.length} · obsoletos: ${stale.length}`)
    if (drift.length || stale.length) {
      for (const d of drift) console.log(`  ~ ${d.file}`)
      for (const s of stale) console.log(`  - ${s}`)
      console.error('Los contratos no están sincronizados. Ejecuta: npm run contracts:sync')
      process.exitCode = 1
    }
    return
  }

  await mkdir(target, { recursive: true })
  for (const d of drift) await writeFile(join(target, d.file), d.want, 'utf8')
  for (const s of stale) await unlink(join(target, s))
  console.log(`[contracts] actualizados: ${drift.length} · eliminados: ${stale.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
