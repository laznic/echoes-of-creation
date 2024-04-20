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

  // These should be the previous thoughts instead of hardcoded
  const texts = [
    "Ah, there it is—the spark of inspiration! That fleeting moment of clarity when an idea takes shape in my mind. It's exhilarating, like catching a glimpse of something magical.",
    "I can't wait to bring this idea to life! The possibilities seem endless, and my mind is buzzing with anticipation. This is why I love being an artist—the thrill of creation.",
    "What is this? AI that paints like me? How can that be? It's like my skills are being copied, replicated effortlessly. Is my art not unique anymore?",
    "No, this can't be real. AI may be good at mimicking, but it can't capture the essence of my creativity. There's more to art than just technique. It's about the soul, about passion. That's something a machine can never have.",
    "Why is this happening? Who created this technology? They're taking away the essence of what it means to be an artist. Years of dedication, practice, and now it feels like it's all for nothing. I won't stand for it.",
    "What does this mean for me? Will I become obsolete? Will people prefer AI-generated art over mine? How will I survive? The uncertainty is terrifying. I can't lose my identity as an artist.",
  ];

  for (let i = 0; i < texts.length; i++) {
    const input = {
      prompt: `Write the following differently but keep the style of it being your thought: ${texts[i]}`,
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
        Pitch: voice === "Dan" || voice === "Will" ? "0.92" : "1.0",
        TimestampType: "sentence",
      }),
    };

    const voiceResponse = await fetch(
      Deno.env.get("UNREAL_SPEECH_API_URL"),
      options
    );

    const voiceResponseJson = await voiceResponse.json();
    const blob = await fetch(voiceResponseJson.OutputUri).then((r) => r.blob());

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
