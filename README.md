# Warcrier Photos bookmarklet

Use your own miniature photos on Warcrier's printable fighter cards. Each card has its own upload and circular crop preview; ability and reaction thumbnails use the first card's photo for that fighter type. Includes drag-to-position, zoom, local saving, restore-original controls, and print/PDF support. Photos are processed and stored in your browser, without a server upload.

Download and extract this repository (or clone it), then open `install.html` in your browser. The installer and bookmarklet are ready to use; Node.js is only needed when rebuilding after source changes.

Open `install.html` in your normal browser and drag **Warcrier Photos** to the bookmarks bar. Open your populated https://warcrier.net/printWarband page, choose Standard Fighter Cards and Show fighter images on abilities, then activate the bookmark.

Choose an individual fighter card (1/2, 2/2, etc.), upload a photo, drag/zoom in the circular preview or use the position sliders, then Apply photo. Each duplicate has an independent photo. Only card 1 supplies the matching ability/reaction portraits; if card 1 has no replacement, abilities retain their original artwork. Close the panel before inspecting the full sheet; the panel is automatically hidden during printing. Print / save PDF waits for the current fighter images to decode before opening the browser print dialog.

The bookmarklet is self-contained and loads no external scripts. Photos are processed in the browser, stored in a dedicated IndexedDB database (`warcrier-custom-photos-v1`), and never written to Warcrier's roster storage. Run the bookmarklet again after each page reload to reapply saved pictures. Original sources are downscaled to at most 1800 pixels and saved with editable crop coordinates; the applied square image is 800 pixels. Storage failure is reported, with session-only editing still available. Browser site-data deletion removes saved photos.

Version 2: replace the installed bookmark and reload the print page once to upgrade. Existing version 1 records become card 1's photo, preserving the ability image. Later copies start with original artwork. Duplicate records use `<fighter-id>::<copy-number>`; the first copy keeps the old fighter-ID key for compatibility. Copy numbers follow sheet order, so pictures follow the numbered positions when duplicate cards are added or removed. The DOM does not expose persistent roster-instance identifiers. Condensed cards without portraits are unsupported. Ability pictures must be enabled in Warcrier's settings. No automatic background removal or project export yet.

## Implementation

Inspected the live print page on 2026-11-11. Standard cards use `.fighter-card-wrap .fighter-card > img`. Their enclosing wrapper contains `a.customise` with the canonical fighter ID in its URL's `id` query parameter. Ability/reaction pictures use `.ability-fighter-pics img` with `/img/fighterPortraits/<id>.jpg`. This permits exact ID matching without guessing names or reading/changing the roster. A mutation observer reapplies photos if Warcrier redraws cards. Original `src`, `srcset`, and `sizes` attributes are retained in memory for reset. Fighter names are inserted as text, not HTML.

Source: `warcrier-photos.js`. Run `node build.cjs` after edits to regenerate `install.html` and `bookmarklet.txt`. No npm dependencies.

For local demo / browser verification, serve this directory, for example `python -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765/install.html. Demo data and photos are stored on the localhost origin, separately from Warcrier. Tests use inspected markup with generated images and demonstrate mapping, cropping, reset, persistence, re-render handling, and bookmarklet reactivation; they do not alter the real roster.
