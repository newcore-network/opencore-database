import { PostgresAdapter } from "./adapters/postgresql.adapter"
import { Mysql2Adapter } from "./adapters/mysql.adapter"
import { Server } from '@open-core/framework'

let registered = false

export function registerPostgresAdapter(): void {
    if(registered) return
    Server.registerDatabaseAdapterFactory('postgres', () => new PostgresAdapter())
    registered = true
}

export function registerMysql2Adapter(): void {
  if (registered) return
  Server.registerDatabaseAdapterFactory('mysql2', () => new Mysql2Adapter())
  registered = true
}