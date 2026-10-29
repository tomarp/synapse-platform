# Publishing the platform at https://synapse.ptomar.com (GitHub Pages)

The app is a static site: GitHub Pages serves this folder as it is. Nothing needs to be built. The folder already
contains `CNAME` (the domain), `.nojekyll` (serve files unchanged), `404.html` and `robots.txt`.

## Your main site (ptomar.com) already runs on GitHub Pages — that is fine

The platform goes into its **own, second repository**; the repository of ptomar.com is not touched. GitHub then
offers two addresses (the app works at both; tested):

| | A. `synapse.ptomar.com` (prepared) | B. `ptomar.com/synapse` |
|---|---|---|
| Repository name | any, e.g. `synapse-platform` | must be `synapse` |
| `CNAME` file in this folder | keep (contains `synapse.ptomar.com`) | **delete it** |
| DNS | add one CNAME record (step 4) | nothing to do |
| HTTPS | tick *Enforce HTTPS* once (step 5) | automatic (inherited from ptomar.com) |
| Looks like | a separate product site | a page of your personal site |

For **B**, also replace `https://synapse.ptomar.com/` by `https://ptomar.com/synapse/` in `index.html` (3 lines:
canonical, og:url, og:image) and in `CITATION.cff` (`url`), and in `404.html` change `/` to `/synapse/` (3 places).
Then skip step 4.

## 1. Create the repository (github.com, once)

1. Sign in on github.com → **New repository**.
2. Name: `synapse-platform` · **Public** · do **not** add a README, licence or .gitignore (they are already here).

## 2. Upload the files (once, then for every update)

The folder has about 120 files (125 MB), more than the web uploader takes at once (100 files), so use git or GitHub Desktop.

**With GitHub Desktop** (no command line): *File → Add local repository →* choose this folder → *create a repository*
→ *Publish repository* (untick "Keep this code private").

**With the command line** (replace `YOUR-GITHUB-NAME`):

```bash
cd output/02_experiment_platform
git init -b main
git add .
git commit -m "SYNAPSE experiment platform v2.2.0"
git remote add origin https://github.com/YOUR-GITHUB-NAME/synapse-platform.git
git push -u origin main
```

Later updates: `git add . && git commit -m "describe the change" && git push`.

## 3. Switch on GitHub Pages

Repository → **Settings → Pages**:
- *Source*: **Deploy from a branch** · Branch **main** · folder **/ (root)** → Save.
- *Custom domain*: `synapse.ptomar.com` (already filled in from the `CNAME` file) → Save.

## 4. Point the subdomain to GitHub (at your domain provider, once)

In the DNS settings of ptomar.com add one record:

| Type | Name / host | Value / target | TTL |
|---|---|---|---|
| CNAME | `synapse` | `YOUR-GITHUB-NAME.github.io` | default |

Use the same DNS provider where the records for ptomar.com are (the A records 185.199.108–111.153 that point
ptomar.com to GitHub). Keep those records as they are.

Your main site (ptomar.com) is not affected. DNS changes usually take minutes, at most 24 h.

## 5. Turn on HTTPS and check

1. Back in **Settings → Pages**, wait until the domain check is green, then tick **Enforce HTTPS**.
2. Open https://synapse.ptomar.com: the home page, *Explore the demo*, a task *Try it*, the Designer.

## Optional: a DOI for the software

On zenodo.org → *GitHub* → switch on the `synapse-platform` repository, then on GitHub create a **Release** (tag `v2.2.0`).
Zenodo archives it and assigns a DOI. Add that DOI to `app/info.js` (`REFERENCES`, entry *Software*) and to
`CITATION.cff`, then push again.
