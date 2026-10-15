# ⚖️ Dota Tribunale

Sito statico che segue alcuni giocatori di Dota 2: statistiche degli ultimi 7 giorni, partite recenti, una pagella settimanale, meme e "capi d'accusa" generati automaticamente dalle loro performance.

- Nessun server e nessun costo: HTML, CSS e JavaScript puri.
- Dati da [OpenDota](https://www.opendota.com) (API gratuita, senza chiave).
- Se OpenDota è giù, il sito usa l'ultima copia salvata in `data/` (aggiornata ogni 2 ore da GitHub Actions) o nella cache del browser.

## Aggiungere un giocatore

Apri `js/config.js` e aggiungi una riga con il suo Steam64 ID (il numero nell'URL `steamcommunity.com/profiles/...`):

```js
{ steam64: "7656119XXXXXXXXXX", alias: "Soprannome", accusa: "Spammatore seriale di Pudge" },
```

## Provarlo sul PC

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Poi apri http://localhost:8080. Aggiungi `?demo` all'URL per vedere la grafica con dati finti.

## Pubblicarlo gratis con GitHub Pages (consigliato)

1. Crea un account su https://github.com (gratis).
2. Crea un nuovo repository **pubblico**, ad esempio `dota-tribunale`.
3. Carica il contenuto di questa cartella (da riga di comando con `git push`, oppure dal sito con "uploading an existing file").
4. Nel repository: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / root → Save**.
5. Dopo circa un minuto il sito è online su `https://<tuo-utente>.github.io/dota-tribunale/`.
6. (Facoltativo) In **Actions**, abilita i workflow e lancia "Aggiorna statistiche": da quel momento i dati vengono salvati ogni 2 ore.

## Alternativa ancora più veloce: Netlify Drop

Vai su https://app.netlify.com/drop e trascina la cartella `dota-tribunale`. Ottieni subito un link pubblico (serve un account gratuito per tenerlo online). In questo caso il salvataggio automatico ogni 2 ore non c'è: i dati arrivano sempre in diretta da OpenDota.
