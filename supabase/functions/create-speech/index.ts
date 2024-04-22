import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";
import Replicate from "https://esm.sh/replicate@0.29.1";
import randomSample from "https://esm.sh/@stdlib/random-sample@0.2.1";
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const replicate = new Replicate({
  auth: Deno.env.get("REPLICATE_API_TOKEN") ?? "",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const voice = randomSample(["Scarlett", "Dan", "Liv", "Will", "Amy"], {
    size: 1,
  })[0];

  const { thought_id = 1 } = await req.json();
  const thoughtIdToUse = thought_id === 1 ? thought_id : thought_id - 1;

  const { data: thought } = await supabaseClient
    .from("thoughts")
    .select(
      `
      id,
      thought_texts(
        index,
        text
      )
    `
    )
    .eq("id", thoughtIdToUse);

  const thoughtTexts = thought[0].thought_texts.sort(
    (a, b) => a.index - b.index
  );

  for (let i = 0; i < thoughtTexts.length; i++) {
    const input = {
      prompt: `Write the following differently but keep the style of it being your thought: ${thoughtTexts[i].text}`,
      temperature: 1.0,
      frequency_penalty: 1.0,
      prompt_template:
        "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nReturn info wrapped as text snippet wrapped in ```. If your suggestion is longer than 150 characters, make it shorter.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
    };

    const textResponse = await replicate.run("meta/meta-llama-3-70b-instruct", {
      input,
    });

    const newText = textResponse.join("").replace(/```/g, "");

    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${Deno.env.get("UNREAL_SPEECH_API_KEY")}`,
      },
      body: JSON.stringify({
        Text: newText,
        VoiceId: voice,
        Bitrate: "192k",
        Speed: "0",
        Pitch: voice === "Dan" || voice === "Will" ? "0.96" : "1.0",
        TimestampType: "word",
      }),
    };

    const voiceResponse = await fetch(
      Deno.env.get("UNREAL_SPEECH_API_URL"),
      options
    );

    const voiceResponseJson = await voiceResponse.json();
    const blob = await fetch(voiceResponseJson.OutputUri).then((r) => r.blob());
    const jsonBlob = await fetch(voiceResponseJson.TimestampsUri).then((r) =>
      r.blob()
    );

    await supabaseClient.storage
      .from("speeches")
      // TODO: Change "1" to be the actual thought ID
      .upload(`${thought_id}/${i}.json`, jsonBlob, {
        contentType: "application/json",
      });

    await supabaseClient.storage
      .from("speeches")
      // TODO: Change "1" to be the actual thought ID
      .upload(`${thought_id}/${i}.mp3`, blob, {
        contentType: "audio/mpeg",
      });

    await supabaseClient.from("thought_texts").insert({
      thought_id,
      text: newText,
      audio_url: `${Deno.env.get(
        "SUPABASE_URL"
      )}/storage/v1/object/public/speeches/${thought_id}/${i}.mp3`,
      index: i,
    });
  }

  return new Response(JSON.stringify({ check: "database" }), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/speech-callback' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
