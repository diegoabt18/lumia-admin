/** Entorno del Server conectado (proyección de GET /api/admin/meta, sin la URL interna). */
export interface ServerEnvironment {
  nodeEnv: string
  databaseProvider: 'atlas' | 'local'
  databaseTier: 'production' | 'staging' | 'development'
}
