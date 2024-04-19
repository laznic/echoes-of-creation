/* eslint-disable @typescript-eslint/ban-ts-comment */
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);
// @ts-expect-error
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const allObjectIDsResponse = await fetch(
    "https://collectionapi.metmuseum.org/public/collection/v1/objects",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const { objectIDs } = await allObjectIDsResponse.json();

  return new Response(JSON.stringify({ hello: objectIDs }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
