# Matice viditelnosti

**Status:** Navrženo ❓, schvaluje zadavatel ([F-13.8][90]) <br>
**Datum:** 03-11-2026

Kdo co v aplikaci vidí. Platí pro UI i API: co role nemá vidět, nesmí přijít ani v odpovědi API.

Je to živý dokument. První verze pokrývá data a role z Issues ve Sprintu 2 a další sprinty ji doplňují.

## Jak matici číst

- Řádek je pole nebo skupina polí, sloupec je role a buňka říká, co role vidí.
- ✅ vidí, ❌ nevidí, ❓ čeká na rozhodnutí zadavatele.
- Role je vztah k zobrazenému záznamu. Organizátor jiné akce je pro tuto akci obyčejný přihlášený uživatel.
- Role se stejnými hodnotami jsou v jednom sloupci a pole se stejnými hodnotami na jednom řádku. Rozdělí se, až když se začnou lišit.
- Hodnota závislá na stavu má vlastní řádek, například veřejné a soukromé prostory.
- Matice řeší jen to, co kdo vidí. Kdo co smí upravit, určují zadání jednotlivých Issues.

## Jak matici udržovat

- Přidává Issue nové pole nebo roli? Uprav matici ve stejném PR.
- Padlo rozhodnutí? Nahraď ❓ výsledkem.

## Akce

- **Návštěvník:** není přihlášený.
- **Přihlášený:** nemá k této akci vztah. Patří sem i organizátor jiné akce a člověk, který se odhlásil, žádost stáhl nebo byl zamítnut.
- **Žadatel:** má na akci čekající žádost.
- **Účastník:** má na akci schválenou účast.
- **Organizátor:** hlavní organizátor a spoluorganizátoři. Spoluorganizátory zatím v aplikaci nejde přidat ([ADR-0005](adr/adr-0005.md)). Až to půjde, je potřeba tuhle tabulku ověřit.

| Pole                                                      | Návštěvník, přihlášený, žadatel | Účastník | Organizátor | Zdroj                |
| --------------------------------------------------------- | ------------------------------- | -------- | ----------- | -------------------- |
| Název, fotka, termín, aktivita, úroveň, obsazenost        | ✅                              | ✅       | ✅          | [#7][7]              |
| Popis, vybavení, příspěvek, stav, způsob schvalování      | ✅                              | ✅       | ✅          | [#8][8]              |
| Důvod zrušení a poznámka k němu                           | ✅                              | ✅       | ✅          | [#35][35]            |
| Jméno organizátora                                        | ✅                              | ✅       | ✅          | [#8][8]              |
| Skupina, která akci pořádá                                | ✅                              | ✅       | ✅          | [#9][9]              |
| Čtvrť a město                                             | ✅                              | ✅       | ✅          | [#7][7]              |
| Složení účastníků: medián věku a poměr pohlaví, od 3 lidí | ✅                              | ✅       | ✅          | [#45][45]            |
| Veřejné místo: název a pin na mapě                        | ✅                              | ✅       | ✅          | [#6][6]              |
| Veřejné místo: ulice                                      | ❌                              | ✅       | ✅          | [#8][8], [#43][43]   |
| Soukromé prostory: přibližná oblast na mapě               | ✅                              | ✅       | ✅          | [#92][92]            |
| Soukromé prostory: název místa, ulice, přesné souřadnice  | ❌                              | ✅       | ✅          | [#67][67], [#43][43] |
| Praktické pokyny                                          | ❌                              | ✅       | ✅          | [#43][43]            |
| Odkaz na externí chat                                     | ❌                              | ✅       | ✅          | [#43][43]            |
| Kontakt na organizátora                                   | ❌                              | ❓       | ✅          | [#43][43], [#19][19] |
| Jména a profily účastníků                                 | ❌                              | ❓       | ✅          | [#90][90], [#31][31] |
| Koncept akce                                              | ❌                              | ❌       | ✅          | [#8][8]              |

## Žádosti o účast a o členství

Pravidla jsou pro oba druhy žádostí stejná.

- **Ostatní:** všichni kromě autora žádosti a toho, kdo ji vyřizuje. Patří sem i schválený účastník téže akce a člen téže skupiny.
- **Autor žádosti:** kdo žádost poslal, i když už je vyřízená nebo stažená.
- **Vyřizuje:** organizátor akce, nebo admin skupiny (role `ADMIN` a `OWNER`).

| Pole                                                  | Ostatní | Autor žádosti | Vyřizuje | Zdroj                           |
| ----------------------------------------------------- | ------- | ------------- | -------- | ------------------------------- |
| Kdo žádá: jméno, fotka, bio, jestli má ověřený e-mail | ❌      | ✅            | ✅       | [#32][32], [#48][48]            |
| Zpráva od žadatele                                    | ❌      | ✅            | ✅       | [#53][53], [#32][32], [#48][48] |
| Stav žádosti                                          | ❌      | ✅            | ✅       | [#41][41], [#31][31], [#52][52] |
| Důvod zamítnutí a zpráva při schválení                | ❌      | ✅            | ✅       | [#52][52], [#153][153]          |

## Profil uživatele

Co ostatní vidí o jednom konkrétním člověku („dotyčném“). Záleží na tom, v jakém vztahu k němu jsou.

- **Sám:** vlastní účet.
- **Návštěvník:** není přihlášený.
- **Přihlášený:** nemá k dotyčnému vztah.
- **Vyřizuje jeho žádost:** organizátor akce nebo admin skupiny, kam má dotyčný čekající žádost.
- **Organizátor jeho účasti:** organizátor akce, na které má dotyčný schválenou účast.
- **Účastník jeho akce:** schválený účastník akce, kterou dotyčný pořádá.

| Pole                                                               | Sám | Návštěvník | Přihlášený | Vyřizuje jeho žádost | Organizátor jeho účasti | Účastník jeho akce | Zdroj                                        |
| ------------------------------------------------------------------ | --- | ---------- | ---------- | -------------------- | ----------------------- | ------------------ | -------------------------------------------- |
| Jméno, fotka, bio, zájmy                                           | ✅  | ❌         | ✅         | ✅                   | ✅                      | ✅                 | [#19][19]                                    |
| Jestli má ověřený e-mail                                           | ✅  | ❌         | ❌         | ✅                   | ✅                      | ❌                 | [#32][32]                                    |
| E-mail                                                             | ✅  | ❌         | ❌         | ❌                   | ✅                      | ❓                 | [#19][19], [#32][32]                         |
| Datum narození, věk, pohlaví                                       | ✅  | ❌         | ❌         | ❌                   | ❌                      | ❌                 | [#12][12], [#18][18], [#19][19], [#32][32]   |
| Lokalita a dojezd                                                  | ✅  | ❌         | ❌         | ❌                   | ❌                      | ❌                 | [#24][24], [#67][67]                         |
| Přehledy: přihlášky, pořádané akce, žádosti o členství, notifikace | ✅  | ❌         | ❌         | ❌                   | ❌                      | ❌                 | [#41][41], [#52][52], [#152][152], [#61][61] |

Notifikace chodí i e-mailem, a to jen příjemci na jeho vlastní ověřenou adresu; e-mail nese totéž co zvoneček, tedy veřejné jméno původce a název akce či skupiny ([#61][61]).

Věk a pohlaví se ostatním ukazují jen souhrnně ve složení účastníků akce ([#45][45]). Jméno organizátora je veřejné přes detail akce ([#8][8]).

## Skupina

- **Člen, admin skupiny:** role `MEMBER`, `ADMIN` a `OWNER`.

| Pole                                                          | Návštěvník, přihlášený, žadatel | Člen, admin skupiny | Zdroj                         |
| ------------------------------------------------------------- | ------------------------------- | ------------------- | ----------------------------- |
| Název, popis, aktivita, lokalita, obvyklý termín, počet členů | ✅                              | ✅                  | [#9][9], [#95][95]            |
| Nadcházející veřejné akce skupiny                             | ✅                              | ✅                  | [#9][9], [#47][47]            |
| Akce jen pro skupinu                                          | ❌                              | ✅                  | [#47][47]                     |
| Minulé akce skupiny                                           | ❌                              | ✅                  | [#47][47]                     |
| Seznam členů: jméno, fotka, role, datum vstupu                | ❌                              | ✅                  | [#9][9], [#47][47], [#94][94] |

[6]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/6
[7]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/7
[8]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/8
[9]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/9
[12]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/12
[18]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/18
[19]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/19
[24]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/24
[31]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/31
[32]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/32
[35]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/35
[41]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/41
[43]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/43
[45]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/45
[47]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/47
[48]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/48
[52]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/52
[53]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/53
[67]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/67
[90]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/90
[92]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/92
[94]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/94
[95]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/95
[152]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/152
[61]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/61
[153]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/153
