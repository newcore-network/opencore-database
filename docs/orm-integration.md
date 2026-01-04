# ORM integration (TypeORM, Prisma, etc.)

This package is designed to integrate with OpenCore’s database layer (`DatabaseContract` / `DatabaseService`). An ORM can coexist with this layer, but it is important to define responsibilities clearly and avoid mixing transaction boundaries.

## Does an ORM replace the adapter?

Not necessarily.

- The OpenCore **adapter** provides a minimal, stable API (SQL + transactions) and enables backend selection via configuration.
- An **ORM** provides domain modeling (entities), repositories, migrations, and its own transaction mechanism.

In practice, both can coexist.

## Recommended pattern: side-by-side coexistence

Use:

- `DatabaseService` / `query()` for simple or utility operations based on SQL.
- The ORM for complex domain logic (repositories, relations, migrations).

### Important rule: do not mix transactions

It is not recommended to run within the same unit of work:

- `DatabaseService.transaction(...)` and
- `dataSource.transaction(...)` (TypeORM) or `prisma.$transaction(...)` (Prisma)

Reason: each layer may take a **different connection from the pool**, and a transaction only applies to the connection it was started on.

If you need transactions:

- Use the ORM’s transaction mechanism for the entire flow, or
- Use `DatabaseService.transaction(...)` for the entire flow.

## Alternative: ORM “under” the adapter

You can also implement an OpenCore adapter whose internal implementation uses the ORM, and of course you can take this base of code and edit whatever you want, for example:

- `query()` delegates to `dataSource.query()`
- `transaction()` delegates to `dataSource.transaction()`

This unifies how transactions are managed from OpenCore, but increases coupling to the ORM.

## Practical recommendation

- If your goal is **compatibility and simple configuration**: use the adapters (`postgres`, `mysql2`) directly.
- If your goal is **domain modeling and migrations**: introduce an ORM as an additional service, keeping the adapter for targeted use cases.