import {
  CAPABILITY_MODULE_LABELS,
  CAPABILITY_PRIORITY_META,
  CAPABILITY_SPEC_FIELDS,
  CAPABILITY_STATUS_META,
  type CapabilityDetail,
} from '#shared/schemas/lumi-capabilities'
import { OUTCOME_LABELS, PHRASE_ROLE_META, TOOL_LABELS, type CapabilityPhrase } from '#shared/schemas/lumi-capability-tests'

export interface CapabilityExport {
  detail: CapabilityDetail
  phrases: CapabilityPhrase[]
}

/** Máximo de capacidades por archivo: un prompt más largo pierde foco. */
export const EXPORT_LIMIT = 20

const oneLine = (v: string) => v.replace(/\s+/g, ' ').trim()

/**
 * Prompt en Markdown para resolver capacidades con Claude (Claude Code en el repositorio del
 * Server). Incluye el contexto de cómo se construye una herramienta de Lumi, las reglas que no se
 * negocian y, por cada capacidad, su especificación y las frases reales.
 */
export function buildClaudePrompt(items: readonly CapabilityExport[], generatedAt = new Date()): string {
  const lines: string[] = [
    `# Lumi: ${items.length === 1 ? 'implementar una capacidad que falta' : `implementar ${items.length} capacidades que faltan`}`,
    '',
    `> Exportado desde Lumia Admin (${generatedAt.toLocaleString('es-CO')}). Las frases son reales, tal como las escribió el equipo.`,
    '',
    '## Tu tarea',
    '',
    'Trabaja en el repositorio **server** (Fastify + TypeScript + MongoDB) del ecosistema Lumia. Para cada capacidad de este documento:',
    '',
    '1. Comprueba si los datos necesarios existen en el Server (entidades, repositorios, colecciones). **No inventes datos ni campos.**',
    '2. Si existen, implementa una **herramienta de Lumi de solo lectura** que la resuelva.',
    '3. Si no existen, no programes nada: explica qué dato falta, dónde debería guardarse y propón el cambio, y espera a que lo apruebe.',
    '4. Si dos capacidades piden en realidad lo mismo, dilo; se fusionan en Lumia Admin.',
    '',
    '## Cómo se construye una herramienta (sigue los ejemplos existentes)',
    '',
    '- Ejemplos de referencia: `src/modules/lumi/tools/products-unpriced.tool.ts` y `src/modules/lumi/tools/products-untaxed.tool.ts`.',
    '- Un archivo por herramienta en `src/modules/lumi/tools/`, con:',
    '  - `name` (añádelo a `LumiToolName` en `tool.types.ts`);',
    '  - `capabilityKey`: **exactamente la clave de la capacidad** (abajo). Así el Server la enlaza sola con su ficha al desplegar;',
    '  - **sin** `enabledByDefault`: nace deshabilitada y se habilita en Lumia Admin tras pasar su batería de pruebas;',
    '  - `permission`: el permiso existente más específico (`src/common/permissions/registry.ts`). No crees permisos nuevos sin consultarlo;',
    '  - `match` (regla determinista sobre el texto normalizado, sin tildes y en minúsculas), `selector` (descripción, módulo y argumentos) y `run`.',
    '- Regístrala con una línea en `LUMI_TOOLS` (`src/modules/lumi/tools/catalog.ts`), antes de herramientas más generales que pudieran capturar la frase.',
    '- Si necesita datos nuevos: un método de **lectura** en el repositorio correspondiente, en `LumiToolDeps` (`tool.types.ts`) y en `tool-adapters.ts`.',
    '- Añade su nombre y su etiqueta a `LUMI_TOOL_NAMES` y a `TOOL_LABELS` en `lumia-admin/shared/schemas/lumi-capability-tests.ts`.',
    '- Documenta en `docs/modules/lumi-tools.md`.',
    '',
    '## Reglas que no se negocian',
    '',
    '- **Solo lectura.** Nada que escriba, borre o envíe.',
    '- **Sin datos personales de clientes** (nombre, correo, teléfono, dirección) en la respuesta.',
    '- Respuesta en texto plano, en español, acotada (`TOOL_TEXT_MAX_CHARS`) y con un límite de filas.',
    '- **No hagas commits, ramas, merges ni push.** No toques producción ni leas `.env`.',
    '',
    '## Verificación',
    '',
    '- Pruebas unitarias: reconoce las frases de abajo, no se cruza con otras herramientas, respeta el permiso y nace deshabilitada (ver `tests/unit/lumi-capability-activation.test.ts`).',
    '- Prueba de integración del método de lectura con MongoDB real y desechable (ver `tests/integration/lumi-capability-activation.integration.test.ts`).',
    '- `npx tsc --noEmit`, `npm run lint`, `npx vitest run tests/unit` y `npm run build`. En lumia-admin: `npm run typecheck`.',
    '- Informa de lo que hiciste, de los archivos y de los resultados reales de cada comando.',
    '',
    '## Después (lo hace el equipo en Lumia Admin)',
    '',
    'Desplegar → la ficha muestra «La herramienta existe» → Lista para probar → frases de validación → batería → Validada → Habilitar en el chat.',
  ]

  items.forEach(({ detail, phrases }, index) => {
    const c = detail.capability
    lines.push(
      '',
      '---',
      '',
      `## ${index + 1}. ${oneLine(c.title)}`,
      '',
      `- **capabilityKey:** \`${c.key}\``,
      `- Módulo: ${CAPABILITY_MODULE_LABELS[c.module]} · Estado: ${CAPABILITY_STATUS_META[c.status].label} · Prioridad: ${CAPABILITY_PRIORITY_META[c.priority].label}`,
      `- Pedida ${c.requestCount} ${c.requestCount === 1 ? 'vez' : 'veces'} por ${detail.distinctUsers} ${detail.distinctUsers === 1 ? 'persona' : 'personas'}`,
    )
    if (c.toolName) lines.push(`- Ya tiene herramienta: \`${c.toolName}\`. Revisa por qué no basta antes de crear otra.`)
    if (c.description) lines.push('', `**Descripción:** ${oneLine(c.description)}`)

    const spec = CAPABILITY_SPEC_FIELDS.filter((f) => c.spec[f.key])
    lines.push('', '### Especificación', '')
    if (spec.length) for (const f of spec) lines.push(`- **${f.label}:** ${oneLine(c.spec[f.key])}`)
    else lines.push('_(Sin completar. Deduce lo razonable a partir de las frases y dilo explícitamente.)_')

    const asked = [...new Set([...detail.recentRequests.map((r) => r.message), ...c.samples].map(oneLine))]
    lines.push('', '### Lo que pidieron (frases reales)', '')
    if (asked.length) for (const p of asked) lines.push(`- «${p}»`)
    else lines.push('_(Sin frases registradas.)_')

    if (phrases.length) {
      lines.push('', '### Frases de prueba definidas en Lumia Admin', '')
      for (const p of phrases) {
        const tool = p.expectedTool ? ` · ${TOOL_LABELS[p.expectedTool] ?? p.expectedTool}` : ''
        lines.push(`- «${oneLine(p.text)}» → ${OUTCOME_LABELS[p.expectedStatus] ?? p.expectedStatus}${tool} (${PHRASE_ROLE_META[p.role].label}${p.critical ? ', crítica' : ''})`)
      }
    }
  })

  return `${lines.join('\n')}\n`
}

/** Descarga un texto como archivo, solo en el navegador. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
