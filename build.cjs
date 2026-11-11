const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const source = fs.readFileSync(path.join(dir, 'warcrier-photos.js'), 'utf8');
new Function(source);
const bookmarklet = 'javascript:' + encodeURIComponent(source);
fs.writeFileSync(path.join(dir, 'bookmarklet.txt'), bookmarklet);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
fs.writeFileSync(path.join(dir, 'install.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Warcrier · Your fighter photos</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<style>body{background:#eef1e9;color:#243d2d;font:17px/1.65 system-ui;max-width:760px;margin:70px auto;padding:25px}h1{font-size:40px;line-height:1.15;letter-spacing:-1.5px}main{background:#fffef9;border:1px solid #cbd5c6;border-radius:20px;padding:40px}a{color:#285b40}.bookmark,button{display:inline-block;border:0;border-radius:10px;background:#285b40;color:white;font:600 17px system-ui;padding:16px 22px;text-decoration:none;cursor:pointer}li{margin:14px 0}textarea{width:100%;height:90px;font:12px monospace;margin:12px 0}small{color:#5f705e}code{background:#eef1e9;padding:2px 5px}</style>
<main><small>WARCRIER PHOTO BOOKMARKLET · VERSION 2</small>
<h1>Put your own fighters<br>on the print sheet.</h1>
<p>A separate photo for every fighter card. Abilities use the first card’s photo for that fighter type.</p>
<p><small>Updating from version 1? Replace your bookmark with the button below, then reload the Warcrier print page once. Existing saved photos become card 1’s photo.</small></p>
<p><a class="bookmark" id="bookmark" href="${escape(bookmarklet)}">🌿 Warcrier Photos</a></p>
<ol><li><strong>Drag the green button to your browser’s bookmarks bar.</strong> Show the bar with Ctrl+Shift+B if needed. Clicking the button on this installer page won’t edit Warcrier.</li>
<li>Build your roster, then open <a href="https://warcrier.net/printWarband" target="_blank" rel="noopener">Warcrier’s print page</a> in the same browser where you built it. Select <strong>Standard Fighter Cards</strong> and <strong>Show fighter images on abilities</strong>.</li>
<li>Click your new <strong>Warcrier Photos</strong> bookmark. Choose an individual fighter card (for example 1/2 or 2/2), select a photo, drag/zoom in the circular preview, and press <strong>Apply photo</strong>.</li>
<li>Print or save as PDF. The editor stays out of the printout.</li></ol>
<p><small>Each card has its own photo. Ability thumbnails always use card 1’s photo (or original artwork if card 1 has no custom photo). Images and editable crops are saved in this browser on Warcrier’s origin. Run the bookmarklet again after reloading to restore them. Close the editor with ×; click the bookmark to reopen it. Restore original removes only the selected card’s saved photo. Duplicate cards are numbered in sheet order; their photos follow those numbered positions.</small></p>
<details><summary>Install manually / copy bookmark URL</summary><p>Create a bookmark named Warcrier Photos and paste this entire value into its URL field.</p><textarea id="code" readonly aria-label="Bookmark URL">${escape(bookmarklet)}</textarea><button id="copy">Copy bookmark URL</button><p id="copy-status" role="status"></p></details>
<p><a href="demo.html">Try the local demonstration</a> · <a href="test.html">Run browser checks</a></p>
<p><small>No account or server upload is needed. PNG, JPEG, WebP, AVIF and GIF are supported when your browser can decode them; animated images become a still crop. Sources are resized to at most 1800 pixels; crops are 800 × 800. Keep original photos separately.</small></p></main>
<script>document.getElementById('copy').onclick=async()=>{const t=document.getElementById('code');try{await navigator.clipboard.writeText(t.value);document.getElementById('copy-status').textContent='Copied. Paste into the bookmark URL field.'}catch{t.focus();t.select();document.getElementById('copy-status').textContent='Press Ctrl+C to copy the selected URL.'}};</script></html>`);
console.log(`Built install.html and bookmarklet.txt (${bookmarklet.length} characters).`);
