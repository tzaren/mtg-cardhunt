# MTG Kortjakt

Mobilanpassad hjälpreda för att jaga kort i fysiska butiker. En enda fil, `index.html`, utan byggsteg eller beroenden.

## Använda i mobilen

1. Lägg `index.html` någonstans som går att nå via https, t.ex. GitHub Pages, Netlify Drop eller en egen webbserver.
   (Att öppna filen direkt via `file://` funkar på dator, men mobilwebbläsare sparar då inte data mellan besöken.)
2. Öppna sidan i mobilen och välj "Lägg till på hemskärmen".
3. Fliken **Decks**: lägg till ett deck, klistra in kortlistan och bocka i vad du redan har. Priser för saknade kort hämtas automatiskt.
4. Prisdata sparas lokalt i mobilen, så listan och bockarna finns kvar även utan täckning i butiken.

## Testa lokalt

```bash
npx serve .
```

eller valfri statisk webbserver i mappen. Sidan hämtar data från Scryfall (`api.scryfall.com`) och valutakurs från Frankfurter (`api.frankfurter.dev`).

## Flikar

- **Set** – saknade kort grupperade per set, som en pärm. Sök på setkod (t.ex. `MH2`) när du står vid en pärm.
- **Kort** – ett kort per rad med billigaste printing, alternativ och bock för "hittad". Tryck på ett kort för alla printings och för att jämföra butikens pris i kronor mot Cardmarket-trend.
- **Decks** – klistra in decklistor du bygger på och bocka i vilka kort du redan har (med antal, t.ex. 2 av 4). Allt som saknas i alla decks slås ihop till jaktlistan som Set och Kort visar. Efter butiksbesöket: "Bokför hittade som ägda" flyttar köpen in i decken.
- **Köp** – köplistan för butiksbesöket. När du hittar ett kort: tryck på det, skriv butikens pris och antal, "Lägg i köplistan". Fliken summerar allt, jämför mot Cardmarket-trend och har en kvittovy ("Visa för kassan") med stor text som personalen kan slå in från. "Köpt – bokför som ägda" flyttar in korten i decken.
- **Mer** – synk mellan enheter, säkerhetskopia, valutakurs, export (CSV eller kopiera shoppinglista), rensa data, tips.

## Synk mellan mobil och dator

Appen kan spara decks, bockar och köplistan i en privat Gist på ditt GitHub-konto. Skapa en fine-grained personal access token på github.com (Settings → Developer settings → Personal access tokens) med enbart **Gists: Read and write**, och klistra in den under Mer → Synk på varje enhet. Ändringar skickas automatiskt och hämtas när appen öppnas. Senaste ändring vinner. Prisdata synkas inte utan hämtas per enhet.

Utan GitHub finns Mer → Säkerhetskopia, som laddar ner allt som en JSON-fil och kan återställas på en annan enhet.

## Listformat

```
Lightning Bolt
4 Sol Ring
Eternal Witness x2
1 Fire // Ice (DMR) 220        # Arena/Moxfield-export funkar
# rader som börjar med # ignoreras
```

Namn som inte matchar exakt slås upp med Scryfalls fuzzy-sökning och markeras med ≈ så du kan dubbelkolla.

## Övrigt

- `MTG app.js` och `Untitled-1.py` är de tidigare versionerna (React-komponent respektive CLI-skript) och används inte av `index.html`.
- Priser är Cardmarkets trendpris via Scryfall. Frakt tillkommer vid köp online, så ett butikspris något över trend är ofta ändå bra.
