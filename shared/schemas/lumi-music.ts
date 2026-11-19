import { z } from 'zod'

/**
 * Reproductor de música de Lumi. La música suena en el servidor del asistente (no en el navegador);
 * el Server reenvía su estado real y acepta una lista cerrada de órdenes del reproductor.
 *
 * Espejo de server/src/modules/lumi/tools/tool.types.ts (LumiMusicState) y de
 * server/src/modules/lumi/schemas/lumi.schema.ts (lumiMusicPlayerCommandSchema).
 */

/** Miniatura pública de YouTube y página del vídeo: lo que no tenga esta forma no se muestra. */
const THUMBNAIL_RE = /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[a-z0-9_]+\.(?:jpg|webp)$/
const WATCH_RE = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/

export const lumiMusicTrackSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1).max(300),
  artist: z.string().max(200).nullable(),
  album: z.string().max(300).nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  thumbnailUrl: z.string().regex(THUMBNAIL_RE).nullable().catch(null),
  url: z.string().regex(WATCH_RE).nullable().catch(null),
  source: z.literal('youtube'),
})

export const LUMI_MUSIC_STATUSES = ['idle', 'loading', 'playing', 'paused', 'stopped', 'error'] as const

export const lumiMusicStateSchema = z.object({
  status: z.enum(LUMI_MUSIC_STATUSES),
  generation: z.number().int(),
  current: lumiMusicTrackSchema.nullable(),
  upcoming: z.array(lumiMusicTrackSchema).max(100),
  positionSeconds: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  volume: z.number().int().min(0).max(100),
  output: z.object({ mode: z.enum(['aux', 'bluetooth']), active: z.boolean() }),
  error: z.string().max(500).nullable(),
})

/** GET /api/admin/lumi/music/state. `available: false`: música apagada o asistente sin respuesta. */
export const lumiMusicStateResponseSchema = z.object({
  available: z.boolean(),
  reason: z.string().nullable(),
  state: lumiMusicStateSchema.nullable(),
})

const noArgs = z.object({}).strict().default({})

/** Órdenes del reproductor (mismas que acepta el Server). Sin búsquedas ni texto libre. */
export const lumiMusicCommandSchema = z.discriminatedUnion('tool', [
  z.object({ tool: z.literal('music.play'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.pause'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.resume'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.stop'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.next'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.previous'), args: noArgs }).strict(),
  z.object({ tool: z.literal('music.volume'), args: z.object({ level: z.number().int().min(0).max(100) }).strict() }).strict(),
  z.object({ tool: z.literal('music.seek'), args: z.object({ position: z.number().int().min(0).max(24 * 3600) }).strict() }).strict(),
  z.object({ tool: z.literal('music.jump'), args: z.object({ position: z.number().int().min(1).max(50) }).strict() }).strict(),
])

/** POST /api/admin/lumi/music/commands: texto determinista del asistente y estado tras la orden. */
export const lumiMusicCommandResponseSchema = z.object({
  ok: z.boolean(),
  available: z.boolean(),
  text: z.string().max(4000),
  state: lumiMusicStateSchema.nullable(),
})

export type LumiMusicTrack = z.infer<typeof lumiMusicTrackSchema>
export type LumiMusicState = z.infer<typeof lumiMusicStateSchema>
export type LumiMusicStatus = LumiMusicState['status']
export type LumiMusicCommand = z.input<typeof lumiMusicCommandSchema>
export type LumiMusicStateResponse = z.infer<typeof lumiMusicStateResponseSchema>
export type LumiMusicCommandResponse = z.infer<typeof lumiMusicCommandResponseSchema>
