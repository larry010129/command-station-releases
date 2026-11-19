# Command Station releases

Public, read-only host for signed content releases (Cloudflare Pages). The app downloads from `/releases/...`.

- Files here are produced by the CMS: run `npm run sync:releases` in `command-station-cms`, then commit and push this repo.
- Never put signing keys here. Only the public release files belong in this repo.
- `_redirects` / `_headers` map the app's URLs onto the files and set cache rules.
