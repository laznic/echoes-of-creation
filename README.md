
# Echoes of Creation

## A digital experience

Echoes of Creation is a digital experience that portrays the excitement and struggles artists have with their creative processes.

[https://echoes-of-creation.pages.dev/](https://echoes-of-creation.pages.dev/)

> **Note**
>
> This project is optimized for desktop devices

Built with
- [Supabase](https://supabase.com)
- [Astro](https://astro.build/)
- [Unreal Speech](https://unrealspeech.com/)
- [GSAP](https://gsap.com/)
- [Stable Diffusion](https://stability.ai/stable-diffusion)
- [Stable Audio](https://stableaudio.com)
- [Replicate](https://replicate.com/)
- [Codrops](https://tympanus.net/codrops)
- [Metropolitan Museum of Art](https://metmuseum.github.io/)

## How it works

The steps are simple:
1. Open web page
2. Wait for images to load (or the page the re-generate)
3. Click start
4. Scroll through the experience

Technical side:
- pg_cron job runs every hour, creates a new "thought"
- Inserts trigger webhook calls to Edge Functions
- In Edge Functions we
  - Fetch the "European Paintings" pieces from the MET Museum API
  - Pick 80 random pieces, one which is the "main" art piece
  - Generate 8 variants for the main art piece via Stable Diffusion based on a description by Meta's LLama 3 model used via Replicate
  - Store this info in Storage and Database
  - Generate different text variants for "thoughts" that happen in the story
  - Generate AI Speeches for all these texts

List of Supabase features used:
- Database
  - storing all the data, obviously
- Functions
  - generates new imagery, text, and audio
- Storage
  - storing images, texts, audio

## Motivation

We've had this idea to make a website that re-creates itself until the end of time, and heavily tied to the AI theme, for over a year. Now we had time to actually do it, even though it's more of a draft version at the moment. It's a good base to build on!

## Ideas for the future

- Improve code quality
- Improve design elements
- Rewrite scrolling as it's buggy
- Add interactive elements that could use realtime features

## The team / contributors
- Niklas Lepistö ([GitHub](https://github.com/laznic), [Twitter](https://twitter.com/laznic))
- Jani Reijonen ([Twitter](https://twitter.com/janireijonen))

## Credits
- Amazing folks at [Codrops](https://tympanus.net/codrops), keep building and sharing those demos as they give so much inspiration to our work.
  - We'll credit few people directly here later as e.g. the mouse trail effect is a direct code grab from the demo GitHub repo with few adjustments. Just need to take a nap and submit the project first!

