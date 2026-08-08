# Gift

Esperienza web statica mobile-first per il regalo.

## URL definitivo

Il solo URL pubblico/canonico è:

`https://matteoroma095.github.io/gift/`

È lo stesso URL codificato nel QR del biglietto stampato. Eventuali vecchi link di test con query come `?v=6` o `?v=7` vengono normalizzati automaticamente all'URL canonico.

## Struttura corrente

- `index.html` — esperienza completa
- `styles.css` — stile base
- `contrast.css` — contrasto per fotografia
- `visual.css` — rendering definitivo degli sfondi e delle scratch card
- `app.js` — navigazione, gratta-e-scopri e scelta finale
- `assets/hq/personal/` — fotografie ottimizzate usate dal sito
- `assets/hq/treatments/` — creativi Clinic usati nelle scratch card
- `.nojekyll` — pubblicazione statica GitHub Pages

Non sono richiesti framework o build step.

## GitHub Pages

Pubblicazione nativa dalla branch `main`, cartella `/(root)`.

## Privacy / indicizzazione

La pagina include `noindex,nofollow,noarchive` e `robots.txt` blocca i crawler. La repository è pubblica, quindi sito e file restano accessibili a chi possiede il link.
