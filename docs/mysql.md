# MySQL (mysql2)

## Activation

Configure the adapter:

```cfg
set opencore_db_adapter "mysql2"
```

## URL configuration (recommended)

```cfg
set opencore_mysql_url "mysql://user:pass@127.0.0.1:3306/mydb"
set opencore_mysql_pool_max "10"
```

## Component-based configuration

```cfg
set opencore_mysql_host "127.0.0.1"
set opencore_mysql_port "3306"
set opencore_mysql_user "user"
set opencore_mysql_password "pass"
set opencore_mysql_database "mydb"
set opencore_mysql_pool_max "10"
```

## Usage in code

Register the adapter once, before initializing OpenCore DB:

```ts
import { registerMysql2Adapter } from '@open-core/database'
import { Server } from '@open-core/framework'

registerMysql2Adapter()
Server.initDatabase()

const db = Server.getDatabaseService()
const users = await db.query('SELECT * FROM users WHERE active = ?', [true])
```

## Notes

- MySQL supports `?` placeholders natively; no conversion is required.
- For transactions, use the **tuple** or **object** format with positional parameters.
