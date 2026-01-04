export {}

declare global {
  function GetConvar(name: string, defaultValue: string): string
  const exports: Record<string, any>
}