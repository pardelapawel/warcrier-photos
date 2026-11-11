# Warcrier Photos bookmarklet

[Open the hosted installer](https://pardelapawel.github.io/warcrier-photos/) — no download or build required.

Use your own miniature photos and fighter names on Warcrier's printable cards. Each fighter type has a switch between one shared photo and individual photos per fighter. Includes a circular crop preview, drag-to-position, zoom, local saving, restore-original controls, and print/PDF support. Photos are processed and stored in your browser, without a server upload.

Download and extract this repository (or clone it), then open `install.html` in your browser. The installer and bookmarklet are ready to use; Node.js is only needed when rebuilding after source changes.

Open `install.html` in your normal browser and drag **Warcrier Photos** to the bookmarks bar. Open your populated https://warcrier.net/printWarband page, choose Standard Fighter Cards and Show fighter images on abilities, then activate the bookmark.

Choose a fighter card (1/2, 2/2, etc.). Turn on **One photo per fighter type** to share one image across that type; leave it off for individual photos. Other fighter types keep their own settings. Shared mode starts with a copy of card 1's photo and keeps its own editable image. Switching back restores the saved individual photos. Abilities use the shared photo in shared mode or the first card's photo in individual mode. Upload, drag/zoom in the circular preview, then Apply photo. Use **Save name** to rename the selected card; names remain individual in either photo mode, and **Restore name** resets just that card. Names are printed labels; roster data, statistics, rules and ability text are preserved. Close the panel before inspecting the sheet; it is automatically hidden during printing.

The bookmarklet is self-contained and loads no external scripts. Photos are processed in the browser, stored in a dedicated IndexedDB database (`warcrier-custom-photos-v1`), and never written to Warcrier's roster storage. Run the bookmarklet again after each page reload to reapply saved pictures. Original sources are downscaled to at most 1800 pixels and saved with editable crop coordinates; the applied square image is 800 pixels. Storage failure is reported, with session-only editing still available. Browser site-data deletion removes saved photos.

Version 3 preserves existing photos and defaults to individual photo mode. Replace the installed bookmark and reload the print page once to upgrade. Duplicate image records use `<fighter-id>::<copy-number>`; the first copy keeps the old fighter-ID key. Shared images use `shared:<fighter-id>`, type settings use `mode:<fighter-id>`, and card names use `name:<card-key>`. All are saved in the existing IndexedDB store. Copy numbers follow sheet order, so photos and names follow those numbered positions when duplicate cards are added or removed. The DOM does not expose persistent roster-instance identifiers. Condensed cards without portraits are unsupported. Ability pictures must be enabled in Warcrier's settings. No automatic background removal or project export yet.

## Implementation

Inspected the live print page on 2026-11-11. Standard cards use `.fighter-card-wrap .fighter-card > img`. Their enclosing wrapper contains `a.customise` with the canonical fighter ID in its URL's `id` query parameter. Ability/reaction pictures use `.ability-fighter-pics img` with `/img/fighterPortraits/<id>.jpg`. This permits exact ID matching without guessing names or reading/changing the roster. A mutation observer reapplies photos if Warcrier redraws cards. Original `src`, `srcset`, and `sizes` attributes are retained in memory for reset. Fighter names are inserted as text, not HTML.

Source: `warcrier-photos.js`. Run `node build.cjs` after edits to regenerate `install.html` and `bookmarklet.txt`. No npm dependencies.

For local demo / browser verification, serve this directory, for example `python -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765/install.html. Demo data and photos are stored on the localhost origin, separately from Warcrier. Tests use inspected markup with generated images and demonstrate mapping, cropping, reset, persistence, re-render handling, and bookmarklet reactivation; they do not alter the real roster.
