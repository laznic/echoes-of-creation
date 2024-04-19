/* eslint-disable @typescript-eslint/ban-ts-comment */
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";
import randomSample from "https://esm.sh/@stdlib/random-sample@0.2.1";
import Replicate from "https://esm.sh/replicate@0.29.1";
import { base64 } from "https://cdn.jsdelivr.net/gh/hexagon/base64@1/src/base64.js";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const replicate = new Replicate({
  auth: Deno.env.get("REPLICATE_API_TOKEN") ?? "",
});

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
  const listOfArtworks = [];
  const addedIDs: number[] = [];

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

    const artwork = await res.json();

    if (!artwork.primaryImageSmall) continue;

    addedIDs.push(artwork.objectID);

    listOfArtworks.push({
      image_url: artwork.primaryImageSmall,
      artist_name: artwork.artistDisplayName,
      is_main: listOfArtworks.length === 0,
      is_variant: false,
      // TODO: Change "1" to be the actual thought ID
      thought_id: 1,
    });
  }

  const mainImage = listOfArtworks[0];

  const output = await replicate.run(
    "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
    {
      input: {
        image: mainImage.image_url,
        top_p: 1,
        prompt: "Describe this painting by " + mainImage.artist_name,
        max_tokens: 1024,
        temperature: 0.2,
      },
    }
  );

  const file = await fetch(mainImage.image_url).then((res) => res.blob());
  const promises = [];

  for (let i = 0; i < 7; i++) {
    const body = new FormData();
    body.append(
      "prompt",
      output.join("") + `, a painting by ${mainImage.artist_name}`
    );
    body.append("output_format", "jpeg");
    body.append("mode", "image-to-image");
    body.append("image", file);
    body.append("strength", clamp(Math.random(), 0.4, 0.7));

    const request = fetch(
      `${Deno.env.get(
        "STABLE_DIFFUSION_HOST"
      )}/v2beta/stable-image/generate/sd3`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${Deno.env.get("STABLE_DIFFUSION_API_KEY")}`,
        },
        body,
      }
    );

    promises.push(request);
  }

  const results = await Promise.all(promises);
  const variants = await Promise.all(results.map((res) => res.json()));

  await supabaseClient.from("artworks").insert(listOfArtworks);

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    await supabaseClient.storage
      .from("variants")
      // TODO: Change "1" to be the actual thought ID
      .upload(`1/${Math.random()}.jpeg`, base64.toArrayBuffer(variant.image), {
        contentType: "image/jpeg",
      });
  }

  return new Response(JSON.stringify({ main: mainImage }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
