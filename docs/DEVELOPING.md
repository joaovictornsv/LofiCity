# LoFi City: developer guide

The full reference that used to live in the README: every city and scene, behaviour rules, URL options, keys, code layout and detailed credits. The short pt-BR overview is in [README.md](../README.md); agent rules are in [AGENTS.md](../AGENTS.md).

Lo-fi pixel-art scenes that follow each city's **real clock** and **live weather**. If it's raining there, it rains on screen; if it's night there, it's night here. Comes with two radio stations playing real music released under Creative Commons.

**Live:** https://loficity-lac.vercel.app

**Cities** (pick one on the map: tap the city name in the panel or press T; Esperança is the default)

- **Campina Grande**: fireworks most nights of its famous São João in June.
  - `Açude Velho`: the glass drums of the Museu de Arte Popular (the "Três Pandeiros") and the high-rises mirrored in the water.
  - `Pirâmide do Parque do Povo` (`piramide-parque-do-povo`): the salmon concrete A-frame across an empty paved lot, with floodlight masts, a borracharia and the city's towers behind. Most of the year it stands quiet with its floodlights off; in June it fills up for the São João: bandeirolas, stalls and dancers under the roof, a fogueira, the floodlights on and "O MAIOR SÃO JOÃO DO MUNDO" in neon along its legs.
  - `Estação Velha`: the yellow 1907 Great Western station, now the Museu do Algodão: terracotta roofs, white quoins, "GWBR" on the gable and the "CAMPINA GRANDE" plaque, the iron railing, a castanhola and the old steam locomotive under its pavilion. Doors open on lit rooms while the museum is open.
  - `Parque da Criança`: a wide view across the park: the cycle and walking path, the sand field with a kickabout by day, royal and coconut palms, the "EU ♥ CORRER" letters, a cobbled plaza, the skate bowl and the old brick chimney, Catolé's towers beyond. No traffic; busiest with runners at dawn and late afternoon, nearly empty late at night.
  - `Partage Shopping`: the mall on Av. Prefeito Severino Cabral: store boards, "ESTACIONAMENTO" over the parking entrance, the red flower emblem and "PARTAGE SHOPPING", the long salmon louvred façade, palms and a bus stop on the busy avenue. Signs and glass light up after dark while it is open.
  - `Terminal de Integração`: the long bus terminal on R. Dom Pedro II: the "SITRANS / STTP" and "TARIFA ZERO" board, concrete fins (one with a painted mural), green railings and passengers on the benches. City buses pull into the bays, wait and leave, more often at rush hour, none in the small hours.

  The five newer Campina scenes were drawn from Google Street View captures (Dec 2024 to Jan 2025, plus 360° photos posted to Google Maps for the park) and Wikimedia Commons photos, as reference only; none of the images are in the repo, and signs show only the lettering legible in them. Opening hours, bus frequency and festival details are art direction, not real timetables.
- **João Pessoa**: `Orla do Cabo Branco`, the sea where the sun rises first in the Americas, jangadas, coconut palms and the triangular lighthouse on the cliff, its beam sweeping the sky at night.
- **Areia**: `Centro Histórico`, the listed colonial town of the Brejo: casario with iron balconies, the Câmara Municipal, the Teatro Minerva (1859), a cachaça shop, cobbles and mist.
- **Remígio**: `Lagoa de Remígio`, the round lagoon with royal palms, houses up the hill, the matriz on top and ducks on the water.
- **Tokyo**: `Esquina da chuva` (rain corner), `Beco neon` (neon alley), `Rua do konbini` (konbini street), `Santuário` (shrine). Japanese seasons: sakura, tsuyu, momiji, year-end snow, hanabi.
- **Esperança, Paraíba, Brazil** (Brasília time). Local calendar: the patron saint's festival in January, Holy Week, São João in June, Christmas.
  - `Praça da Matriz`: the yellow Nossa Senhora do Bom Conselho church with its slender clock tower and spire, seen from the street: the paved praça with trees and lamps on the left, and on the right the road toward Campina Grande behind a yellow curb, with shops, poles and wires across it. Traffic only uses that road, drawn in perspective (going away in the right lane, oncoming in the left), and stops for people on the zebra crossing.
  - `Rua do Comércio`: the main shopping street, with a bar that puts its tables out at night.
  - `Capelinha das Pedras`: the tiny 1925 chapel on the Lajedo do Araçá rock, beside the pool that mirrors it, painted the Matriz's yellow. A quiet spot: no traffic and usually nobody around. Now and then a visitor walks up to take photos, and on some days (more often on Sundays, always on 27 June and 1 January) there is one short daytime mass: the door opens on a lit interior, a priest waits at the door and a handful of people come and go. This is art direction, not the chapel's real schedule: each day's events come from a seed of the local date (so `#at=` shows the same day), all between 07:00 and 17:00, and the weather does not change them.
  - `Praça da Cultura`: the town's postcard square: broad blue steps up to a red plaza, red steps up to the cream-yellow building with its outlined arched blue door, royal palms and an araucária, the red and white "EU ♥ ESPERANÇA" letters with their big heart, craft fairs and the Paixão de Cristo in Holy Week.
  - `Campo da Rodoviária` (`campo-rodoviaria`, the owner's "Campo do América"): the fenced artificial-turf pitch behind a wall of football murals, where two sides actually play: five outfield players and a keeper each, plus a referee, passing, dribbling, shooting and now and then scoring (a short celebration, then a kickoff), with spectators on the wall. A new match starts every 1h30 from 08:00 to 20:00 local time (08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00, 18:30, 20:00); each lasts until the next start and the last ends at 21:00, so there is no play before 08:00 or from 21:00. That duration is an artistic assumption, not a real fixture list. Each match gets a new pair of high-contrast kits (chosen from the local date and slot, so `#at=` shows the same kits) with keepers and referee in distinct colours; the 18:30 and 20:00 games are played under the lit floodlights. Heavy rain or a storm in the real reading pauses play (the players wait on the far touchline and the spectators leave); light rain plays on. The score is not shared between visitors: each viewer's match starts at 0-0 when they open the scene. Tapping a player shows a football line.
  - `Centro · Casa de Amigos` (`centro-teatro`): the frontage across the wide avenue through the centre: the tall cream-tiled block with dark glass bands and the "DECORAMA / CASA DE AMIGOS" billboard (lit by its floodlights at night), "ZARB", "JM BOLOS" and "ÓTICAS DINIZ" on the left, the white and red colonial front, "TUDO 10" and "LOJÃO" on the right, motorcycles at the far kerb and the traffic-light pole in the foreground. Two-way traffic on the avenue stops for people on the zebra on the left, as at Praça da Cultura.
  - `Armazém Paraíba`: the orange store with its round logos and "FIADO SÓ AQUI" banner, goods on the shelves and fridges under "LIQUIDANDO" while it is open, the open lot beside it, the long orange wall ("PEGUE AQUI", "3222-5000", the painted mascot) and a cream colonial front. Motorcycles parked nose-in at the kerb; traffic on the road in front (no zebra).
  - `Rua Faustino Porto`: a street seen down its length: the pink corner house with its balustered balcony and the "BOLOS · SE FAZ A DIFERENÇA" panel, the modern block with its glass curtain wall on the right, motorcycles at the kerb and a zebra in the foreground. Traffic keeps to its lane (going away on the right, oncoming on the left) and stops while anyone waits at or walks on the zebra; people walk only on the sidewalks and cross on the stripes.
  - `Rua José Bezerra da Costa`: a long street seen down its length: the low whitewashed wall on the left with cars parked along it, a paved island with a round planter, a median with trees, a kiosk and a double street light, two- and three-storey shops on the right, a blue truck and a white "SUPER ESPERANÇA" van at the kerb. No zebra here: people stay on the sidewalks and traffic runs both ways on the right-hand carriageway.

  The Matriz, Praça da Cultura and Campo da Rodoviária scenes were drawn using Google Maps captures as reference only (Feb 2020, Feb 2025 and Jun 2025); the Matriz and Praça da Cultura also used the owner's own photos, as reference only. Centro, Armazém Paraíba, Rua Faustino Porto and Rua José Bezerra da Costa were drawn from the owner's photos (Street View captures), as reference only; signs show only the lettering legible in them. They may not match the places today, and none of the images are in the repo.

Esperança's streets are busy with local life: motorcycles of every kind (mototáxi, delivery, the gas man with a botijão), Viação São José buses, the prefeitura school bus, carros-pipa, donkey carts, the carro de som, pickups carrying furniture, a Veraneio now and then; joggers, sun umbrellas and street vendors; street dogs, cats on the walls, birds on the wires, vultures on the thermals and bats around the lamps.

Everything is drawn in code, with no image assets: an indexed framebuffer whose palette is graded for day, night, sunset and overcast skies.

**Tap anything that moves**: birds fly off the wires, cats bolt along the walls, dogs bark and run, people answer with a short speech bubble, and every vehicle has its own horn, from the moto's beep to the São José bus, the donkey cart's bray and the carro de som's jingle. In Praça da Matriz, tap the church and its bell strikes once. All sounds are synthesized in the browser.

The bubbles are silent and come from an authored pool of gentle pt-BR lines with a Paraíba accent (simple pt-BR with a few Japanese words in Tokyo), picked for the city, the scene, the time of day (manhã, tarde, noite, madrugada) and the real weather only: heat lines need a real reading of 30 °C or more, cold lines a real low temperature, rain lines real precipitation (or the `#wx=` test); with no reading there are no weather lines at all. The same line doesn't come back right away, at most two bubbles show at once, each hides after about 3 s, and changing scene or city clears them. In the Capelinha only its visitors, the priest and the congregation speak.

**Little moments**: now and then (a few times an hour at most, one at a time) something small happens in Rua do Comércio, Praça da Cultura, Estação Velha, Parque da Criança and the Cabo Branco seafront: a street dog tags along behind someone, a picolé, pipoca or água de coco seller stops for a while, a kid kicks a ball on the sidewalk, a cat crosses a wall, someone feeds the pigeons, a delivery moto pulls over at a shop. They follow the city's clock (only the occasional dog at madrugada) and the real weather: no vendor, ball or pigeons in real rain or with no reading. The schedule is fixed by scene and time, so a `#at=` moment always shows the same thing (`#debug` shows the running and next one). With ambient sound on, the seller's little bell or whistle sounds once, softly, and never while the radio plays.

**Church bells (Esperança)**: with ambient sound on (M), the matriz strikes the hours on Esperança's real clock (Brasília time), from 05:00 through 00:00, counting in 12-hour style (13h = 1 strike, 00h = 12); it is silent from 01:00 to 04:00. You hear it in every Esperança scene: near in Praça da Matriz, farther away and softer elsewhere. Missed hours are never replayed (background tab, sleep, reload, turning sound on late), and nothing rings while a `#at=` moment is pinned.

**Daily rhythm**: crowds, traffic and birds follow each city's own clock, interpolated smoothly between hours (and `#at=` moments). Esperança, Campina Grande and João Pessoa all use Brasília time (UTC-3, the same as Fortaleza, no daylight saving), and so do the weekday and calendar.

- Esperança's Praça da Matriz and Praça da Cultura are busiest from 14h to 15h. Around 17h the birds get busy, flying back to the trees and wires (this depends on the time only, not the temperature). From 19h the streets thin out; 21–23h and 00–05h are nearly empty, with just the odd dog or passer-by.
- Campina Grande and João Pessoa are busier by day and in the evening, but still have few people out from 00h to 05h.
- **Mass at the Matriz**: the doors open, the nave is lit and a small congregation gathers by the church on Sundays at 07, 09, 16 and 19h, and Monday to Friday at 19h. Assumptions, not an official parish timetable: each mass lasts 1 hour, and there is no Saturday mass. The rest of the praça stays quiet.
- Weather is never made up here: only real rain, storms and snow from Open-Meteo (live or stale) scale these crowd levels down; with no reading ("clima indisponível") the rhythm runs unscaled.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # dist/index.html, a single self-contained file
pnpm typecheck  # tsc --noEmit
pnpm shot       # screenshots into ./shots (needs a build; NODEBUG=1 hides the debug panel, --hud-off hides the panels)
pnpm test       # unit tests for the pure rules in test/ (node --test; Node >= 22.18, no extra deps)
```

## Sharing

The address bar always holds the current view: `#city=` and `#scene=` are rewritten (with `history.replaceState`, so no reload and no extra history entries) whenever the city or scene changes, and `#at=` stays there when a moment is pinned. Other options the page was opened with (`#debug`, `#wx=`, `#car=`) are left alone in the address bar.

The share button under the eye (top-right, visible even with the HUD hidden) opens two actions:

- **Copiar link**: copies the permalink (city, scene and any pinned `#at=`, never `#debug`, `#wx=` or `#car=`) and shows "Link copiado". A live view gives a live link: whoever opens it sees the same place at its real time and weather.
- **Baixar card**: saves `loficity-<city>-<scene>-<HHMM>.png`, a 1080x1920 story card drawn locally from the scene's framebuffer (rendered once into a portrait frame, through the current palette) with the time, city, scene, date, "LOFI CITY" and the site address.

Nothing is uploaded or posted; the person sends the link or image themselves. The radio and ambience are not touched. Pure rules live in `src/share-rules.ts` (tested in `test/share-rules.test.ts`), the DOM side in `src/share.ts`.

## URL options

- `#city=esperanca` (also `campina`, `joaopessoa`, `areia`, `remigio`, `tokyo`)
- `#scene=praca-matriz`: pin a scene (`praca-matriz`, `rua-comercio`, `capelinha`, `praca-cultura`, `campo-rodoviaria`, `centro-teatro`, `armazem-paraiba`, `rua-faustino`, `rua-jose-bezerra`, `acude-velho`, `piramide-parque-do-povo`, `estacao-velha`, `parque-da-crianca`, `partage-shopping`, `terminal-integracao`, `cabo-branco`, `centro-areia`, `lagoa-remigio`, `rain-corner`, `neon-alley`, `konbini`, `shrine`)
- `#at=2026-12-24T22:00`: freeze a moment in the city's time zone (for testing; the UI always uses real time)
- `#debug`: technical panel (for development)
- `#wx=rain`: test override for previews (`clear`, `cloudy`, `rain`, `snow`, `storm`, `fog`); the HUD marks it as a test, never as live
- `#car=bus`: make most Esperança traffic one kind, for previews (`moto`, `hatch`, `sedan`, `suv`, `pickup`, `veraneio`, `kombi`, `som`, `pipa`, `carroca`, `bus`, `micro`, `escolar`)

## Keys

T city map, S scene, R radio, N next track, P switch station (Lo-fi / Neon), M ambient sound, C CRT, H hide/show the panels, Enter fullscreen. L triggers a lightning strike only in test mode (`#debug` or a `#wx=` override); in normal use it does nothing and lightning comes only from real storm data.

The city map is a pixel map of Paraíba with a pin per city, generated from the city registry; cities outside Paraíba (Tóquio) are listed under it. Esc, the × button or a tap outside closes it without changing the city.

The eye button (top-right) hides the whole HUD, credit included, for a clean view; the choice is remembered. Hiding it does not pause the radio. The radio tries to start by itself on load; browsers block that until the page has had a gesture, so it then starts on the first tap or key press (unless the listener already used the radio controls). Fullscreen is on the button and Enter only (no double-click), so quick taps on the scene never resize it.

## Layout

- `src/engine`: indexed framebuffer, palette, WebGL2 post-processing
- `src/sky`: cities, clock and astronomy, live weather (`weather-feed.ts` holds the pure live / stale / unavailable rules, unit-tested; `live.ts` the network), palette grading; `rhythm.ts` holds the pure, unit-tested daily rhythm (crowds, birds, mass times)
- `src/fx`: rain, snow, petals and leaves, lightning, fireworks
- `src/actors`: pedestrians, cars and motorcycles, trees
- `src/scenes`: shared passes, the Esperança prop kit (`br-kit.ts`) and one file per scene
- `src/ui`: the city map (`map-rules.ts` holds the pure, unit-tested projection, label layout and pick/dismiss rules; `paraiba.ts` the state outline)
- `src/audio`: generative ambience, synthesized SFX and church bells (`bells-schedule.ts` holds the pure rules and `bells-scheduler.ts` the timer, both unit-tested), and the radio
- `test`: `node --test` unit tests

## Credits

- **Weather**: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). No API key; refreshes every 10 minutes. Weather is never simulated: if a fetch fails, the last real reading for that city stays on screen marked "dados de HH:MM · sem atualização" (for up to 12 h); with no reading the HUD says "clima indisponível" over a neutral sky with no rain, snow, storm or fog. Failures are retried 3 times (15 s, 1 min, 3 min), then every 10 minutes until the API answers again.
- **Map**: Paraíba outline from [IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html) (Malhas territoriais, simplified), public data reused with credit; it is drawn in code as pixels, no map tiles or API.
- **Music**: streamed from the [Internet Archive](https://archive.org/), released by their labels under Creative Commons licenses. The radio shows each track's artist, album and license with a link to the original page.
  - **Lo-Fi City** (amber; instrumental lo-fi beats, no vocals): 10 albums from the [Dusted Wax Kingdom](https://archive.org/details/dustedwaxkingdom) netlabel that the label itself describes as instrumental hip-hop: Kova (*Cookin' Session*), deeB (*Daydream*, *Thru Nature*), Romo (*Listen, Love*), Thegntlmn (*Earbuds* vol. 1 and 2), Derlee (*Mellow Morning*), Fredo (*First Movements*), DJ Mentos (*Field of Vision*) and JCreate (*Musical Introspection*) (CC BY-NC-ND 3.0/4.0).
  - **Neon FM** (magenta; dreamwave, chillsynth, chillwave): Lee Rosevere (*Synthcronicity*, Happy Puppy Records, CC BY-NC 3.0), Proton 42 (*Sub-Suburbia*, Cian Orbe, CC BY-NC-ND 4.0), Psychadelik Pedestrian (*All Of Time*, Toucan Music, CC BY-NC-SA 4.0), Kansas Beach Patrol (*Coast to Coast*, CC BY 3.0), Evenings (*North Dorm EP*, mam!records, CC BY-NC-ND 3.0), Tiiiza (*W8 EP*, Subwise, CC BY-ND 3.0) and District Lost (*Beyond Comprehension*, CC BY-NC-ND 4.0).
  - The album list is in `src/audio/radio.ts`. Intros, interludes, skits, vocal features, vocal versions, covers, tributes and tracks under 75 s or over 8 min are skipped. If a track or album fails, the radio skips ahead with a short pause between tries, and after 5 failures in a row it stops and says so.
  - The music is **not** part of this repository or its MIT license, and the NC licenses forbid commercial use.

## Privacy

The hosted site uses [Vercel Web Analytics](https://vercel.com/docs/analytics) and [Speed Insights](https://vercel.com/docs/speed-insights). Both are cookieless and only collect visit counts per city (`/tokyo`, `/esperanca`) and performance metrics. Nothing is sent when running locally.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

Code under the [MIT](../LICENSE) license.
