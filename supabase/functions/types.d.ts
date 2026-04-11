declare module 'https://esm.sh/@supabase/supabase-js@2.50.0' {
  export function createClient(...args: unknown[]): unknown
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}
