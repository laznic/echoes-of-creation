/* eslint-disable @typescript-eslint/ban-ts-comment */
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";
import randomSample from "https://esm.sh/@stdlib/random-sample@0.2.1";

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
    "https://collectionapi.metmuseum.org/public/collection/v1/objects?departmentIds=11",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const { objectIDs } = await allObjectIDsResponse.json();
  let listOfArtworks = [];
  let addedIDs: number[] = [];

  while (listOfArtworks.length < 20) {
    const randomObjectID = randomSample(objectIDs, { size: 1 })[0];

    if (addedIDs.includes(randomObjectID)) continue;

    const res = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${randomObjectID}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    let artwork = await res.json();

    if (!artwork.primaryImageSmall) continue;

    addedIDs.push(artwork.objectID);

    listOfArtworks.push({
      image_url: artwork.primaryImageSmall,
      is_main: listOfArtworks.length === 0,
      is_variant: false,
      thought_id: 1,
    });
  }

  await supabaseClient.from("artworks").insert(listOfArtworks);

  return new Response(JSON.stringify({ randomIDs: listOfArtworks }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
