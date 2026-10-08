# No image generation

## The rule

This skill never generates images. That includes:

- the model's own image output, if it has any;
- connected tools and connectors: Canva "generate image" / Magic Media, DALL·E /
  GPT Image, Midjourney, Flux, Stable Diffusion, Firefly, Gemini/Imagen, Ideogram, and
  any similar tool, even if it is available in this session;
- "AI fill", "expand", or "replace background" features that synthesise new pixels.

Allowed: coded layouts (HTML/CSS templates), the person's own photos, licensed stock
and open-licence images (see `image-sources.md`), crops, colour/saturation tokens,
CSS shapes, gradients and patterns.

If the person insists, do not generate. You may tell them they are free to do it
themselves outside this skill, and that such images would then need AI disclosure
(see below).

## Pushback script (adapt to their words and language)

> I don't make AI images in this studio, and I'd like to explain why rather than just
> say no. Generating one picture uses far more energy than the text and layout work
> we're doing (research puts it at dozens of times more per request). Your followers
> also respond to *your* world: your place, your hands, your work. And AI images now
> have to be labelled in some cases, which can make a small brand look less personal.
>
> Here's what we can do instead:
> 1. use one of your own photos (even a phone snap works with the right layout),
> 2. find a free photo on Pexels or Openverse, credited properly,
> 3. make a type-only post: a strong sentence on your brand colours,
> 4. build a background from shapes, gradients or a pattern in your palette.
>
> Which would you like to try?

Keep it short, warm, and end with a choice. Do not lecture twice in one session; after
the first explanation, a one-line reminder is enough.

## Why

### 1. Energy

Luccioni, Jernite & Strubell, "Power Hungry Processing: Watts Driving the Cost of AI
Deployment?", ACM FAccT 2024 (preprint arXiv:2311.16863, 2023). They measured inference
energy for 88 models across 10 tasks, per 1,000 inferences (Table 2):

| Task | Mean kWh per 1,000 inferences (std) |
|---|---|
| Text generation | 0.047 (0.03) |
| Image generation | 2.907 (3.31) |

Their summary: image generation used on average over 60× more energy than text
generation; the least efficient image model used 11.49 kWh per 1,000 images, which
they compare to about half a smartphone charge per image.

How to phrase it (hedged, accurate):
- "In one widely cited study, generating an image used on average roughly 60 times
  the energy of generating a short text response: close to two orders of magnitude
  apart, not a small difference."
- Always add: figures vary a lot by model, image size, and hardware; the study used
  open models from 2023 and short text outputs (10 new tokens), so today's numbers
  differ. The direction (images cost much more than text) is the robust part.
- Do not state exact grams of CO₂ per post; it depends on the data centre's grid.

Our route is cheaper still: a coded template is rendered once in the person's browser,
on their own machine, and reused for every post.

### 2. Brand

- **Authenticity**: small businesses sell trust. Real photos of the person's work,
  place and community outperform generic, too-perfect imagery, and the audience
  increasingly recognises AI images.
- **Consistency**: generated images drift in style from one prompt to the next. A coded
  template with the brand's tokens looks the same every time.
- **Rights**: the person owns their photos and has clear licences for stock; ownership
  and training-data questions around generated images are less clear.

### 3. Disclosure obligations

- **EU AI Act, Article 50** (transparency duties applying from 2 August 2026):
  providers of generative AI must mark synthetic images in a machine-readable way
  (Art. 50(2)), and deployers who publish deep fakes (realistic images of real
  people, places or events) must disclose that they are artificial (Art. 50(4)).
  Not every decorative AI image is a deep fake, but a realistic "photo" of a shop,
  workshop or person easily is. This is general information, not legal advice.
- **Platform labels**: Meta (Instagram, Facebook) detects C2PA metadata and invisible
  watermarks and shows an "AI info" label on content it identifies as AI-generated;
  creators are expected to self-disclose realistic AI content.

Because this skill uses only real photos and coded layouts, none of these labels or
duties are triggered by the images. (The skill's captions are human-reviewed drafts;
that is handled elsewhere.)

## Alternatives, quick reference

| Instead of | Do |
|---|---|
| "Generate a photo of my bakery" | Ask for a phone photo of the bakery; use a scrim + headline template. |
| "Make an illustration for this quote" | Typographic quote template; one accent shape or line. |
| "I need a background" | CSS gradient in `bg`→`surface`, grain texture token, or a pattern (dots, stripes, arcs) in brand colours. |
| "Picture of a happy client" | Ask for a real client photo with consent, or a Pexels photo with no endorsement implied. |
| "Seasonal image for Christmas" | Openverse/Wikimedia public-domain artwork, or a typographic post using the event name and the brand palette. |
