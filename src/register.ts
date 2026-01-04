import { registerDatabaseAdapterFactory } from "@open-core/framework/dist/runtime/server"
import { PostgresAdapter } from "./adapters/postgresql.adapter"
import { Mysql2Adapter } from "./adapters/mysql.adapter"

let registered = false

export function registerPostgresAdapter(): void {
    if(registered) return
    registerDatabaseAdapterFactory('postgres', () => new PostgresAdapter())
    registered = true
}

export function registerMysql2Adapter(): void {
  if (registered) return
  registerDatabaseAdapterFactory('mysql2', () => new Mysql2Adapter())
  registered = true
}