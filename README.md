# Hemanshi Dubey — portfolio and CV

| | |
|---|---|
| **Live site** | <https://hemanshiportfolio-mxp3.vercel.app> — a Vercel project importing this repo as-is (framework: Other, no build, root `/`) |
| **CV** | `Hemanshi_Dubey_CV.pdf` — one A4 page, served at `/Hemanshi_Dubey_CV.pdf` |
| **Reel** | `reel/index.html` — a 12-second HyperFrames composition; `reel/hemanshi-reel.mp4` is its render |

The site is static: no build step, no dependencies. GSAP 3.14.2 and the fonts (Fraunces,
Inter) are vendored into `assets/`. `.vercelignore` keeps `cv/` and `tools/` out of the deploy.

## Layout

```
index.html       the portfolio
styles.css
main.js          choreography (GSAP + ScrollTrigger)
ink.js           hand-drawn layer: boil, brush wipe, grain
reel/            HyperFrames composition + rendered MP4
assets/          photo cut-out, fonts, GSAP, favicon, og.jpg
vercel.json      cache + security headers
cv/
  cv.html        CV source (edit this, not the PDF)
  build-cv.cjs   prints cv.html to Hemanshi_Dubey_CV.pdf and fails if it spills past one page
tools/
  og.html        1200×630 link-preview card
  build-og.cjs   renders it to assets/og.jpg
```

## Rebuild

```bash
node cv/build-cv.cjs          # CV -> Hemanshi_Dubey_CV.pdf
node tools/build-og.cjs       # share card -> assets/og.jpg
npx hyperframes@0.8.177 render . -c reel/index.html -o reel/hemanshi-reel.mp4 --quality delivery
```

All three need Playwright's Chromium; the reel also needs ffmpeg. On Linux without Chrome,
point HyperFrames at Playwright's shell:
`PRODUCER_HEADLESS_SHELL_PATH=/path/to/chromium_headless_shell/chrome-linux/headless_shell`.

## Where the motion comes from

| Source | Used for |
|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) (Apache-2.0) | The reel is a HyperFrames composition (one paused, seekable GSAP timeline; renders frame-exact to MP4 and also plays live on the page). The site's choreography follows its motion rules: `power3.out` as the house settle, count-up with dynamic scale, SVG path draw, waterfall entries, sine loops never in phase, backspace-and-retype. |
| [buildwithhanif/claude-animation-skill](https://github.com/buildwithhanif/claude-animation-skill) (MIT) | Seeded `hash`/`rng`, `grainCanvas`, the midpoint-quadratic outline, and **boil** — linework redrawn with fresh jitter 8–10× a second on the hero halo and the stat rings. |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT) | The brush-wipe transition, rebuilt on a plain 2D canvas for the page intro, and its timing doctrine (one read at a time, fast actions, slow meanings). |
| [WinterArc21/Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film) | Film finish: grain and vignette over the frame. |
| [guanmo-ai/awesome-ai-motion](https://github.com/guanmo-ai/awesome-ai-motion), [athemeroy/awesome-opus-5-5-videos](https://github.com/athemeroy/awesome-opus-5-5-videos) | Direction: the "branded motion-design showreel" brief (a supplied brand kit beats an unbranded one) and the dataset's finding that motion-graphics/UI work splits into dark-neutral and light-neutral palettes — this one is dark-neutral with a marigold accent. |
| [Remotion](https://www.remotion.dev/docs/ai/skills) | Not used: it is React-based; HyperFrames covers the same HTML-to-video job without a bundler. |

`prefers-reduced-motion` turns all of it off: no intro wipe, no boil, no grain animation, the
reel parks on its end card.
