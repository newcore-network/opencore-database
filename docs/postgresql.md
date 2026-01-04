 # PostgreSQL (pg)

 ## Activation

 Configure the adapter:

 ```cfg
 set opencore_db_adapter "postgres"
 ```

 ## URL configuration (recommended)

 ```cfg
 set opencore_pg_url "postgres://user:pass@127.0.0.1:5432/mydb"
 set opencore_pg_pool_max "10"
 ```

 ## Component-based configuration

 ```cfg
 set opencore_pg_host "127.0.0.1"
 set opencore_pg_port "5432"
 set opencore_pg_user "user"
 set opencore_pg_password "pass"
 set opencore_pg_database "mydb"
 set opencore_pg_pool_max "10"
 ```

 ## Usage in code

 Register the adapter once, before initializing OpenCore DB:

 ```ts
 import { registerPostgresAdapter } from '@open-core/database'
 import { Server } from '@open-core/framework'

 registerPostgresAdapter()
 Server.initDatabase()

 const db = Server.getDatabaseService()
 const users = await db.query('SELECT * FROM users WHERE active = ?', [true])
 ```

 ## Notes

 ### Placeholders

 PostgreSQL uses positional placeholders (`$1`, `$2`, ...). For compatibility with SQL written for MySQL/oxmysql, this adapter automatically converts `?` placeholders into `$n` placeholders.

 ### `insertId`

 PostgreSQL does not have a global “last insert id” equivalent. If you need `insertId`, return it explicitly via `RETURNING`:

 ```sql
 INSERT INTO users (name) VALUES (?) RETURNING id
 ```

 ### Transactions

 For transactions, use the **tuple** or **object** formats with positional parameters. The oxmysql-style named shared parameters format (using `@name` / `TransactionSharedParams`) is not supported by this adapter.
