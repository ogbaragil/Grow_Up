
// Welcome email flow placeholder.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Welcome email function ready"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});
