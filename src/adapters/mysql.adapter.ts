import { Server } from '@open-core/framework'

import mysql, { type Pool, type PoolOptions, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'

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

function buildPoolOptionsFromConvars(): PoolOptions {
  const url = getOptionalConvar('opencore_mysql_url', '')
  const connectionLimit = getOptionalIntConvar('opencore_mysql_pool_max', 10)

  if (url) {
    return {
      uri: url,
      connectionLimit,
    }
  }

  return {
    host: getRequiredConvar('opencore_mysql_host'),
    port: getOptionalIntConvar('opencore_mysql_port', 3306),
    user: getRequiredConvar('opencore_mysql_user'),
    password: getRequiredConvar('opencore_mysql_password'),
    database: getRequiredConvar('opencore_mysql_database'),
    connectionLimit,
  }
}

type NormalizedTxQuery = { sql: string; params?: any[] }

function normalizeTransactionQueries(
  queries: Server.TransactionInput,
  sharedParams?: Server.TransactionSharedParams,
): NormalizedTxQuery[] {
  if (queries.length === 0) return []
  const first = (queries as any)[0]

  if (typeof first === 'string') {
    if (sharedParams && Object.keys(sharedParams).length > 0) {
      throw new Error(
        "[OpenCoreDB] MySQL adapter doesn't support named sharedParams transactions (the '@name' format). Use tuple/object format with positional params.",
      )
    }
    return (queries as string[]).map((sql) => ({ sql }))
  }

  if (Array.isArray(first)) {
    return (queries as [string, any[]?][]).map(([sql, params]) => ({ sql, params }))
  }

  return (queries as Array<{ query: string; values?: any[] }>).map((q) => ({
    sql: q.query,
    params: q.values,
  }))
}

export class Mysql2Adapter extends Server.DatabaseContract {
  private pool: Pool

  constructor(pool?: Pool) {
    super()
    this.pool = pool ?? mysql.createPool(buildPoolOptionsFromConvars())
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, params)
    return (rows as unknown as T[]) ?? []
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
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params)
    return { affectedRows: result.affectedRows ?? 0 }
  }

  async insert(sql: string, params?: any[]): Promise<Server.InsertResult> {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params)
    const insertId = typeof result.insertId === 'number' ? result.insertId : Number(result.insertId ?? 0)
    return { insertId: Number.isFinite(insertId) ? insertId : 0 }
  }

  async transaction(
    queries: Server.TransactionInput,
    sharedParams?: Server.TransactionSharedParams,
  ): Promise<boolean> {
    const normalized = normalizeTransactionQueries(queries, sharedParams)
    if (normalized.length === 0) return true

    const conn = await this.pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const q of normalized) {
        await conn.query(q.sql, q.params)
      }
      await conn.commit()
      return true
    } catch (e) {
      try {
        await conn.rollback()
      } catch {}
      return false
    } finally {
      conn.release()
    }
  }
}