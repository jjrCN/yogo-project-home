# YOGO project homepage

This repository contains a static GitHub Pages homepage for the paper:

**You Only Gaussian Once: Controllable 3D Gaussian Splatting for Ultra-Densely Sampled Scenes**

The current version is intentionally paper-first:

- A polished landing page based on the paper narrative
- A strong homepage structure inspired by pages like MVP and the Nerfies academic template
- Reserved slots for teaser videos, qualitative comparisons, benchmark tables, and scene galleries
- A GitHub Pages workflow that deploys automatically from GitHub Actions

## Files

- `index.html`: page structure and copy
- `assets/styles/main.css`: page styling
- `assets/scripts/main.js`: small interaction helpers
- `assets/images/yogo-paper-cover.png`: PDF cover preview generated from `YOGO.pdf`
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow

## Local preview

Run:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## GitHub Pages deployment

This repo already includes a GitHub Actions workflow for Pages.

1. Create a GitHub repository.
2. Push this folder to the repository's default branch, usually `main`.
3. In GitHub, open `Settings -> Pages`.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Pushes to `main` will trigger deployment automatically.

If your repository is named `YOGO`, the final site URL will usually look like:

`https://<your-github-username>.github.io/YOGO/`

## Before public release

The current PDF says `Anonymous ECCV 2026 submission`. If the work is still under double-blind review, publishing a public project page may reveal the submission and create policy risk. In that case:

- keep the repository private for now, or
- wait until the anonymity restriction is lifted before turning Pages on publicly

When you are ready, update:

- the author line in `index.html`
- the BibTeX entry in `index.html`
- the code, dataset, video, and project links in the Resources section
- the placeholder media blocks with your final assets
