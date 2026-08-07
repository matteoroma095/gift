# Gift

Piccola esperienza web statica, mobile-first, per presentare un regalo in modo interattivo.

## Struttura

- `index.html` — esperienza completa
- `styles.css` — interfaccia trasparente / mobile-first
- `app.js` — navigazione, scelta e gratta-e-scopri
- `assets/personal/` — 10 fotografie usate come sfondi
- `assets/treatments/` — 4 immagini dei trattamenti
- `.nojekyll` — pubblicazione statica senza elaborazione Jekyll

Non sono richiesti framework, build step o dipendenze esterne.

## GitHub Pages

Per questa repo la configurazione più semplice è la pubblicazione nativa da branch:

1. `Settings` → `Pages`
2. `Build and deployment` → `Source`: **Deploy from a branch**
3. `Branch`: **main**
4. Cartella: **/(root)**
5. `Save`

L'URL atteso è `https://matteoroma095.github.io/gift/`.

## Privacy / indicizzazione

La pagina include `noindex,nofollow,noarchive` e `robots.txt` blocca i crawler. Poiché la repository è pubblica, i file e l'URL restano comunque accessibili a chi possiede il link.
