// `error instanceof Error` is not a safe way to detect a real error message —
// PostgrestError (thrown by every failed supabase.rpc()/query call) does
// extend Error in source, but that check can still fail depending on how
// the error crosses a boundary (fetch polyfills, bundler transpilation of
// classes extending built-ins, etc.). This checks for a usable `message`
// string directly instead of relying on the prototype chain, so a real
// error from Postgres is never silently replaced by a generic fallback —
// which is exactly what hid the actual cause of the "no se pudo abrir la
// caja" bug (the Postgres exception message was there the whole time,
// just never shown).
export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message
  }
  return fallback
}
