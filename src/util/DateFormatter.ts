function now(dateString = Date.now()): Date {
  const date = new Date(dateString)
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  )
}
function nowAsString(): string {
  const date = now()
  return (
    date.getUTCFullYear() +
    ('0' + (date.getUTCMonth() + 1)).slice(-2) +
    ('0' + date.getUTCDate()).slice(-2) +
    ('0' + date.getUTCHours() + 1).slice(-2) +
    ('0' + date.getUTCMinutes()).slice(-2) +
    ('0' + date.getUTCMilliseconds()).slice(-2)
  )
}
export { now, nowAsString }
