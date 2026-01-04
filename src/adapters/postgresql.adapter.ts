import { Server } from '@open-core/framework'
import { Pool, type PoolConfig } from 'pg'
import { toPgPlaceHolders } from '../sql/pg-placeholders'

function getRequiredConvar(name: string): string {
  const value = globalThis.GetConvar?.(name, '')?.trim() ?? ''
  if (!value) throw new Error(`[OpenCoreDB] Missing required convar '${name}'`)
  return value
}

function getOptionalConvar(name: string, fallback = ''): string {
  return globalThis.GetConvar?.(name, fallback)?.trim() ?? fallback
}

function getOptionalIntConvar(name: string, fallback: number): number {
  const raw = getOptionalConvar(name, String(fallback))
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function buildPoolConfigFromConvars(): PoolConfig {
  const url = getOptionalConvar('opencore_pg_url', '')
  if (url) {
    return {
      connectionString: url,
      max: getOptionalIntConvar('opencore_pg_pool_max', 10),
    }
  }

  return {
    host: getRequiredConvar('opencore_pg_host'),
    port: getOptionalIntConvar('opencore_pg_port', 5432),
    user: getRequiredConvar('opencore_pg_user'),
    password: getRequiredConvar('opencore_pg_password'),
    database: getRequiredConvar('opencore_pg_database'),
    max: getOptionalIntConvar('opencore_pg_pool_max', 10),
  }
}

function normalizeTransactionQueries(
  queries: Server.TransactionInput,
  sharedParams?: Server.TransactionSharedParams,
): Array<{ sql: string; params?: any[] }> {
  if (queries.length === 0) return []

  const first = (queries as any)[0]

  if (typeof first === 'string') {
    if (sharedParams && Object.keys(sharedParams).length > 0) {
      throw new Error(
        "[OpenCoreDB] Postgres adapter doesn't support named sharedParams transactions (the '@name' format). Use tuple/object format with positional params.",
      )
    }
    return (queries as string[]).map((q) => ({ sql: q }))
  }

  if (Array.isArray(first)) {
    return (queries as [string, any[]?][]).map(([sql, params]) => ({ sql, params }))
  }

  return (queries as Array<{ query: string; values?: any[] }>).map((q) => ({
    sql: q.query,
    params: q.values,
  }))
}

export class PostgresAdapter extends Server.DatabaseContract {
  private pool: Pool

  constructor(pool?: Pool) {
    super()
    this.pool = pool ?? new Pool(buildPoolConfigFromConvars())
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const pgSql = toPgPlaceHolders(sql)
    const res = await this.pool.query(pgSql, params)
    return (res.rows ?? []) as T[]
  }

  async single<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows[0] ?? null
  }

  async scalar<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const row = await this.single<Record<string, any>>(sql, params)
    if (!row) return null
    const firstKey = Object.keys(row)[0]
    return (firstKey ? (row[firstKey] as T) : null) ?? null
  }

  async execute(sql: string, params?: any[]): Promise<Server.ExecuteResult> {
    const pgSql = toPgPlaceHolders(sql)
    const res = await this.pool.query(pgSql, params)
    return { affectedRows: res.rowCount ?? 0 }
  }

  async insert(sql: string, params?: any[]): Promise<Server.InsertResult> {
    const pgSql = toPgPlaceHolders(sql)
    const res = await this.pool.query(pgSql, params)

    const firstRow = res.rows?.[0]
    const insertIdRaw =
      firstRow?.id ?? firstRow?.insertId ?? firstRow?.insert_id ?? firstRow?.ID ?? null

    const insertId = typeof insertIdRaw === 'number' ? insertIdRaw : Number(insertIdRaw ?? 0)
    return { insertId: Number.isFinite(insertId) ? insertId : 0 }
  }

  async transaction(queries: Server.TransactionInput, sharedParams?: Server.TransactionSharedParams): Promise<boolean> {
    const normalized = normalizeTransactionQueries(queries, sharedParams)
    if (normalized.length === 0) return true

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const q of normalized) {
        const pgSql = toPgPlaceHolders(q.sql)
        await client.query(pgSql, q.params)
      }
      await client.query('COMMIT')
      return true
    } catch (e) {
      try {
        await client.query('ROLLBACK')
      } catch {}
      return false
    } finally {
      client.release()
    }
  }
}