# @open-core/database

Database adapter package for **OpenCore**. It provides `DatabaseContract` implementations and registration helpers so you can access databases through the framework’s standard API (`query`, `single`, `scalar`, `execute`, `insert`, `transaction`).

## Purpose

This package aims to:

- Allow selecting the database backend **only via configuration** (convars), without changing data-access code.
- Keep compatibility with OpenCore’s database abstraction (`DatabaseService`).
- Provide production-ready adapters for:
  - PostgreSQL (`postgres`)
  - MySQL (`mysql2`)

## How it works (high level)

OpenCore resolves the database adapter using `opencore_db_adapter` and a factory registered through `registerDatabaseAdapterFactory(name, factory)`.

This package exposes:

- `registerPostgresAdapter()` (registers `opencore_db_adapter=postgres`)
- `registerMysql2Adapter()` (registers `opencore_db_adapter=mysql2`)

Once the adapter is registered, you can initialize OpenCore’s database service and use the standard database functions.

## Installation

```bash
pnpm add @open-core/database
```

> This package includes driver dependencies (`pg`, `mysql2`).

## Quickstart

1. Register the adapters at the start of your server/resource.
2. Configure `opencore_db_adapter` and the driver-specific convars.
3. Initialize the framework database module.

Example:

```ts
import { registerPostgresAdapter, registerMysql2Adapter } from '@open-core/database'
import { Server } from '@open-core/framework'

registerPostgresAdapter() // or registerMysql2Adapter()
Server.initDatabase()
// we highly recommend using the databaseService by injection
const rows = await Server.query('SELECT 1 as ok')
```

## Configuration

- `opencore_db_adapter`
  - `postgres`
  - `mysql2`

Guides:

- [PostgreSQL](./docs/postgresql.md)
- [MySQL](./docs/mysql.md)
- [ORM integration](./docs/orm-integration.md)

## Compatibility notes

- Transactions using the oxmysql-style named shared parameters format `@name` (`TransactionSharedParams`) are not supported by these adapters. Use the **tuple** or **object** format with positional parameters.
- For PostgreSQL, to obtain `insertId` reliably, use `RETURNING id`.
