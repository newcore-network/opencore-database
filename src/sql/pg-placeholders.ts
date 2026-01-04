export function toPgPlaceHolders(sql: string): string {
    let idx = 0
    return sql.replace(/\?/g, () => {
        idx += 1
        return `$${idx}`
    })
}