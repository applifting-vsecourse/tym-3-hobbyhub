# Matice viditelnosti

**Status:** Schváleno ✅ zadavatelem 5. 11. 2026 s úpravami ([F-13.8][90], [vyjádření zadavatele][po]) <br>
**Datum:** 06-11-2026

Kdo co v aplikaci vidí. Platí pro UI i API: co role nemá vidět, nesmí přijít ani v odpovědi API.

Viditelnost nenastavuje uživatel. V této verzi produktu není žádný přepínač „soukromý profil“ ani skrývání jednotlivých zájmů; viditelnost je daná rolí a vztahem k záznamu tak, jak ji popisuje matice.

Je to živý dokument: popisuje cílový stav, i pro pole a role, které v aplikaci ještě nejsou.

## Jak matici číst

- Řádek je pole nebo skupina polí, sloupec je role a buňka říká, co role vidí.
- ✅ vidí, ❌ nevidí, ❓ čeká na rozhodnutí zadavatele. Text v buňce („jen své“, „jen na report“) je výjimka, kterou vysvětluje poznámka pod tabulkou.
- Role je vztah k zobrazenému záznamu. Organizátor jiné akce je pro tuto akci obyčejný přihlášený uživatel.
- Role se stejnými hodnotami jsou v jednom sloupci a pole se stejnými hodnotami na jednom řádku. Rozdělí se, až když se začnou lišit.
- Hodnota závislá na stavu má vlastní řádek, například veřejná a soukromá skupina.
- Matice řeší jen to, co kdo vidí. Kdo co smí upravit, určují zadání jednotlivých Issues.

## Jak matici udržovat

- Přidává Issue nové pole nebo roli? Uprav matici ve stejném PR.
- Padlo rozhodnutí? Nahraď ❓ výsledkem.
- Ke každému ❌ patří jeden test proti API, který tvrdí, že pole v odpovědi není. Ne test, že se nevykreslí: test, že nepřijde. Dokud test neexistuje, je řádek návrh, ne hotová věc.

## Pravidla napříč maticí

Platí pro všechny tabulky, ať se řádek týká akce, skupiny nebo profilu.

- **Vyhledávání a detail jsou dvě cesty k témuž záznamu.** Ohlídat jen výpis nestačí: záznam, který se nemá zobrazit, se nesmí vydat ani na přímý odkaz.
- **Nepřihlášený, který přijde na přímý odkaz, vidí přesně to, co by viděl ve výpisu.** Ne víc.
- **Agregát nesmí prozradit to, co skrývá jednotlivý údaj.** Údaj, který nikdo nemá vidět, nesmí jít dopočítat z údaje, který vidět smí. Proto komu se zobrazuje jmenný seznam účastníků, tomu se nezobrazuje složení účastníků. Totéž platí pro každé další souhrnné číslo, které v aplikaci vznikne.
- **Nedostupný obsah se chová, jako by neexistoval**, ne jako by byl zamčený. Hláška „nemáte přístup“ prozrazuje, že tam něco je, a kdo to tam dal.
- **Hodnocení akcí i jednotlivců má stejné pravidlo** ([#44][44]): průměr hvězdiček a počet hodnocení je veřejný údaj, slovní hodnocení je soukromé mezi autorem a adresátem. U hodnocení akce to znamená mezi autorem a organizátorem. Nevidí ho ostatní účastníci, přátelé ani organizátor dalších akcí.
- **Notifikace a e-mail nesou jen důvod a odkaz.** Detail se zobrazí až po přihlášení a tam platí matice. Upozornění v aplikaci vidí jen jeho příjemce a ukazuje jen to, co příjemce vidí podle matice ([ADR-0015](../adr/adr-0015.md)). E-mail žije mimo přihlášení, dá se přeposlat a zpětně ho nikdo neskryje, proto nenese jméno účastníka, přesnou adresu ani existenci neveřejné akce. Výjimky, kde obsah ve zprávě být musí: ověření e-mailu při registraci a při změně e-mailu ([#13][13], [#16][16]) a obnova hesla ([#16][16], [#57][57]).

## Superadmin

Správce aplikace ([#70][70], [#71][71], [#72][72]) je v každé tabulce samostatný sloupec, ne nepsaná výjimka. Vidí všechny akce, skupiny a profily včetně konceptů a soukromých a může blokovat uživatele, akce i skupiny. Dvě hranice:

- **Soukromý obsah nevidí automaticky.** Slovní hodnocení a zprávy mezi uživateli vidí jen na základě nahlášení ([#64][64], [#73][73]) a jen to, co nahlášení popisuje. V tabulkách „jen na report“.
- **Každý přístup superadmina k soukromému obsahu se zaznamenává.**

## Zablokovaný uživatel

Blokování ([#65][65]) mění viditelnost napříč celou aplikací, proto je v každé tabulce samostatný sloupec **Zablokovaný**: koho organizátor akce, dotyčný člověk nebo vlastník skupiny zablokoval.

- Obsah toho, kdo mě zablokoval, pro mě **neexistuje**: nevidím jeho akce ve výpisu ani ve vyhledávání, nedostanu se na ně odkazem, nevidím jeho profil ani jeho skupiny a nedostávám jeho notifikace.
- **Nedozvím se, že jsem zablokovaný.** Obsah se chová, jako by nebyl, ne jako by byl zamčený.

Blokovaný nemůže podat žádost o účast ani o členství ([#65][65]), v tabulce žádostí je proto mezi ostatními.

## Akce

- **Návštěvník:** není přihlášený.
- **Přihlášený:** nemá k této akci vztah. Patří sem i organizátor jiné akce a člověk, který se odhlásil, žádost stáhl nebo byl zamítnut.
- **Žadatel:** má na akci čekající žádost, nebo je v čekací listině jako náhradník ([#34][34]).
- **Účastník:** má na akci schválenou účast.
- **Organizátor:** hlavní organizátor a spoluorganizátoři ([ADR-0005](../adr/adr-0005.md)).
- **Superadmin** a **Zablokovaný:** viz výše.

| Pole                                                                             | Návštěvník, přihlášený, žadatel | Účastník | Organizátor  | Superadmin    | Zablokovaný | Zdroj                                    |
| -------------------------------------------------------------------------------- | ------------------------------- | -------- | ------------ | ------------- | ----------- | ---------------------------------------- |
| Název, fotka, termín, aktivita, úroveň, obsazenost (počet přihlášených)          | ✅                              | ✅       | ✅           | ✅            | ❌          | [#7][7]                                  |
| Popis, vybavení, příspěvek, způsob schvalování                                   | ✅                              | ✅       | ✅           | ✅            | ❌          | [#8][8]                                  |
| Stav akce: zveřejněná, zrušená, proběhlá                                         | ✅                              | ✅       | ✅           | ✅            | ❌          | [#8][8], [PO][po]                        |
| Důvod zrušení a poznámka k němu                                                  | ✅                              | ✅       | ✅           | ✅            | ❌          | [#35][35]                                |
| Jméno organizátora                                                               | ✅                              | ✅       | ✅           | ✅            | ❌          | [#8][8]                                  |
| Skupina, která akci pořádá                                                       | ✅                              | ✅       | ✅           | ✅            | ❌          | [#9][9]                                  |
| Veřejná adresa: čtvrť a město, orientační bod z našeptávače a bod na mapě        | ✅                              | ✅       | ✅           | ✅            | ❌          | [#6][6], [#7][7], [PO][po]               |
| Přesná adresa                                                                    | ❌                              | ✅       | ✅           | ✅            | ❌          | [#43][43], [#67][67], [PO][po]           |
| Odkaz na online akci                                                             | ❌                              | ✅       | ✅           | ✅            | ❌          | [ADR-0006](../adr/adr-0006.md), [PO][po] |
| Praktické pokyny                                                                 | ❌                              | ✅       | ✅           | ✅            | ❌          | [#43][43]                                |
| Odkaz na externí chat                                                            | ❌                              | ✅       | ✅           | ✅            | ❌          | [#43][43]                                |
| Kontakt, který organizátor sám vyplnil pro účastníky                             | ❌                              | ✅       | ✅           | ✅            | ❌          | [#43][43], [PO][po]                      |
| Jmenný seznam schválených účastníků: jména a profily                             | ❌                              | ✅       | ✅           | ✅            | ❌          | [#31][31], [#90][90], [PO][po]           |
| Složení účastníků: věk v rozpětí desetiletí, pohlaví slovní kategorií, od 5 lidí | ✅                              | ❌       | ❌           | ✅            | ❌          | [#45][45], [PO][po]                      |
| Průměr hodnocení akce a počet hodnocení                                          | ✅                              | ✅       | ✅           | ✅            | ❌          | [#44][44], [PO][po]                      |
| Slovní hodnocení akce                                                            | ❌                              | jen své  | ✅           | jen na report | ❌          | [#44][44], [PO][po]                      |
| Pořadí v čekací listině                                                          | jen své                         | jen své  | celá listina | ✅            | ❌          | [#34][34], [PO][po]                      |
| Historie změn akce: posun termínu, změna místa                                   | ❌                              | ✅       | ✅           | ✅            | ❌          | [#35][35], [PO][po]                      |
| Že je akce placeně propagovaná                                                   | ✅                              | ✅       | ✅           | ✅            | ❌          | [#37][37], [PO][po]                      |
| Že je akce zablokovaná správcem, a důvod                                         | ❌                              | ❌       | ✅           | ✅            | ❌          | [#72][72], [PO][po]                      |
| Koncept akce                                                                     | ❌                              | ❌       | ✅           | ✅            | ❌          | [#8][8], [PO][po]                        |

- **Veřejná a přesná adresa jsou dvě uložené hodnoty, ne jedna hodnota zobrazená dvakrát.** Veřejná adresa je povinná, organizátor ji vybírá z našeptávače (nejbližší křižovatka, zastávka, park nebo jiný orientační bod) a podle ní se vykresluje bod na mapě. Přesná adresa je nepovinná a zadává se zvlášť. Komu nepřísluší, tomu se nesmí poslat: ani v odpovědi API, ani v náhledu, ani v notifikaci.
- **Kontakt na organizátora** je text, který organizátor sám vyplní, nikdy e-mail jeho účtu. Veškerá komunikace jde přes aplikaci; kontakt mimo ni je rozhodnutí organizátora, ne vedlejší efekt přihlášky.
- **Jmenný seznam účastníků vidí ostatní účastníci.** Je to sdílená aktivita a lidé mají právo vědět, s kým někam jdou; organizátor je navíc všechny schválil. Proto se jim nezobrazuje složení účastníků: u malé skupiny jde z agregátu a jmen dopočítat konkrétní člověk.
- **Placená propagace musí být viditelně označená.** Neoznačená placená propagace klame člověka, který si v aplikaci hledá partu.
- **Akce zablokovaná správcem** se pro všechny kromě organizátora a superadmina chová, jako by neexistovala.

## Žádosti o účast a o členství

Pravidla jsou pro oba druhy žádostí stejná.

- **Ostatní:** všichni kromě autora žádosti a toho, kdo ji vyřizuje. Patří sem i schválený účastník téže akce, člen téže skupiny a zablokovaný uživatel.
- **Autor žádosti:** kdo žádost poslal, i když už je vyřízená nebo stažená.
- **Vyřizuje:** organizátor akce, nebo admin skupiny (role `ADMIN` a `OWNER`).
- **Zpráva při zrušení účasti** patří k účasti, která vznikla ze žádosti: autor je ten, kdo účast zrušil, vyřizují organizátoři akce (hlavní i spoluorganizátoři). Ostatní účastníci ji nevidí. Organizátor ji vidí v upozornění a v přehledu účastníků pod „Odhlášení“ spolu s tím, co vidí o žadateli (jméno, fotka, bio, ověřený e-mail). U nové žádosti po odhlášení ji organizátor nevidí: nové místo začíná bez ní.

| Pole                                                  | Ostatní | Autor žádosti | Vyřizuje | Superadmin | Zdroj                                     |
| ----------------------------------------------------- | ------- | ------------- | -------- | ---------- | ----------------------------------------- |
| Kdo žádá: jméno, fotka, bio, jestli má ověřený e-mail | ❌      | ✅            | ✅       | ✅         | [#32][32], [#48][48]                      |
| Zpráva od žadatele                                    | ❌      | ✅            | ✅       | ✅         | [#53][53], [#32][32], [#48][48], [PO][po] |
| Stav žádosti                                          | ❌      | ✅            | ✅       | ✅         | [#41][41], [#31][31], [#52][52]           |
| Důvod zamítnutí a zpráva při schválení                | ❌      | ✅            | ✅       | ✅         | [#52][52], [#153][153]                    |
| Zpráva organizátorům při zrušení účasti               | ❌      | ✅            | ✅       | ✅         | [#42][42], [ADR-0017](../adr/adr-0017.md) |

## Profil uživatele

Co ostatní vidí o jednom konkrétním člověku („dotyčném“). Záleží na tom, v jakém vztahu k němu jsou.

- **Sám:** vlastní účet.
- **Návštěvník:** není přihlášený.
- **Přihlášený:** nemá k dotyčnému vztah. Patří sem i účastník akce, kterou dotyčný pořádá, a organizátor akce, které se dotyčný neúčastní.
- **Přítel:** je s dotyčným propojený.
- **Vyřizuje jeho žádost:** organizátor akce nebo admin skupiny, kam má dotyčný čekající žádost.
- **Organizátor jeho účasti:** organizátor akce, na které má dotyčný schválenou účast.
- **Superadmin** a **Zablokovaný** (koho dotyčný zablokoval): viz výše.

| Pole                                                               | Sám | Návštěvník | Přihlášený | Přítel | Vyřizuje jeho žádost | Organizátor jeho účasti | Superadmin    | Zablokovaný | Zdroj                                                             |
| ------------------------------------------------------------------ | --- | ---------- | ---------- | ------ | -------------------- | ----------------------- | ------------- | ----------- | ----------------------------------------------------------------- |
| Jméno a příjmení, fotka, bio, seznam zájmů                         | ✅  | ❌         | ✅         | ✅     | ✅                   | ✅                      | ✅            | ❌          | [#19][19], [PO][po]                                               |
| Průměr hodnocení a počet hodnocení                                 | ✅  | ❌         | ✅         | ✅     | ✅                   | ✅                      | ✅            | ❌          | [#44][44], [PO][po]                                               |
| Jestli má ověřený e-mail                                           | ✅  | ❌         | ❌         | ❌     | ✅                   | ✅                      | ✅            | ❌          | [#32][32], [PO][po]                                               |
| Historie účasti a pořádaných akcí                                  | ✅  | ❌         | ❌         | ✅     | ❌                   | ❌                      | ✅            | ❌          | [#56][56], [PO][po]                                               |
| Slovní hodnocení, která obdržel                                    | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | jen na report | ❌          | [#44][44], [PO][po]                                               |
| Lokalita a dojezd                                                  | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | ✅            | ❌          | [#24][24], [#67][67], [PO][po]                                    |
| Rok narození, věk, pohlaví                                         | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | ✅            | ❌          | [#12][12], [#18][18], [#19][19], [#32][32], [#174][174], [PO][po] |
| E-mailová adresa                                                   | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | ✅            | ❌          | [#19][19], [#32][32], [PO][po]                                    |
| Placené členství                                                   | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | ✅            | ❌          | [#23][23], [PO][po]                                               |
| Přehledy: přihlášky, pořádané akce, žádosti o členství, notifikace | ✅  | ❌         | ❌         | ❌     | ❌                   | ❌                      | ✅            | ❌          | [#41][41], [#52][52], [#152][152], [#61][61], [PO][po]            |

- **Veřejný profil** je jméno a příjmení, fotka, bio, seznam zájmů a průměrné hodnocení. Nic víc.
- **Lokalitu, dojezd, rok narození, věk a pohlaví nevidí nikdo** kromě vlastníka účtu. Ani přítel, ani organizátor akce, na kterou je člověk přihlášený. Věk a pohlaví se ostatním ukazují jen souhrnně ve složení účastníků akce, v rozpětí a jen tomu, kdo nevidí jmenný seznam ([#45][45]).
- **Přesné datum narození aplikace nezná.** Drží jen rok, věk ve složení účastníků je proto přesný na rok ([#174][174], [ADR-0016](../adr/adr-0016.md)).
- **E-mailovou adresu nevidí nikdo**, ani organizátor u svého účastníka.
- **Historie akcí**, kde člověk byl a co pořádal, je až pro propojené uživatele. To je hlavní věc, kterou propojení přináší. Jméno organizátora je i tak veřejné přes detail akce ([#8][8]).
- **Notifikace chodí i e-mailem**, jen příjemci a jen na jeho ověřenou adresu ([#61][61]). E-mail podle pravidla výše říká jen, co se stalo, a odkazem vede do aplikace: nenese jméno původce, název akce ani skupiny, ani zprávu organizátora nebo správce. Detail se ukáže až po přihlášení.
- **Slovní hodnocení** vidí jeho autor a hodnocený. Autor není role vázaná na profil, proto je to poznámka, ne sloupec.

## Skupina

- **Člen:** role `MEMBER`.
- **Admin skupiny:** role `ADMIN` a `OWNER`.
- **Superadmin** a **Zablokovaný** (koho vlastník skupiny zablokoval): viz výše.

| Pole                                                                           | Návštěvník, přihlášený, žadatel | Člen | Admin skupiny | Superadmin | Zablokovaný | Zdroj                                   |
| ------------------------------------------------------------------------------ | ------------------------------- | ---- | ------------- | ---------- | ----------- | --------------------------------------- |
| Název, popis, aktivita, lokalita, obvyklý termín, počet členů                  | ✅                              | ✅   | ✅            | ✅         | ❌          | [#9][9], [#95][95]                      |
| Že soukromá skupina existuje: název, popis, aktivita, lokalita                 | ✅                              | ✅   | ✅            | ✅         | ❌          | [#93][93], [PO][po]                     |
| Veřejná skupina: nadcházející veřejné akce                                     | ✅                              | ✅   | ✅            | ✅         | ❌          | [#9][9], [#47][47]                      |
| Soukromá skupina: akce, členové, dění                                          | ❌                              | ✅   | ✅            | ✅         | ❌          | [#93][93], [PO][po]                     |
| Akce jen pro skupinu                                                           | ❌                              | ✅   | ✅            | ✅         | ❌          | [#47][47]                               |
| Minulé akce skupiny                                                            | ❌                              | ✅   | ✅            | ✅         | ❌          | [#47][47]                               |
| Seznam členů: jméno, fotka, role (kdo je vlastník a kdo správce), datum vstupu | ❌                              | ✅   | ✅            | ✅         | ❌          | [#9][9], [#47][47], [#94][94], [PO][po] |
| Počet čekajících žádostí                                                       | ❌                              | ❌   | ✅            | ✅         | ❌          | [#48][48], [PO][po]                     |
| Jména žadatelů a jejich zprávy                                                 | ❌                              | ❌   | ✅            | ✅         | ❌          | [#48][48], [PO][po]                     |
| Zabanovaní členové a důvod                                                     | ❌                              | ❌   | ✅            | ✅         | ❌          | [#94][94], [PO][po]                     |

**Soukromá skupina je dohledatelná, ale zavřená.** Skupina, kterou nejde najít, nemůže shánět lidi, a to je důvod, proč produkt existuje. Vidět má jít, že existuje a čemu se věnuje; co se v ní děje, ne.

**Akce jen pro skupinu vidí i ten, kdo na ní má místo** ([#47][47]). Kdo má schválenou účast, je náhradník nebo má čekající žádost, vidí akci dál, i když ze skupiny odejde nebo je odebrán. Jinak by se z akce nemohl odhlásit a zmizela by mu z přehledu. Pro všechny ostatní mimo skupinu akce neexistuje: není ve výpisu skupiny a na odkaz vrací „nenalezeno“.

[po]: review-2026-11-05.md
[6]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/6
[7]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/7
[8]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/8
[9]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/9
[12]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/12
[13]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/13
[16]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/16
[18]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/18
[19]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/19
[23]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/23
[24]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/24
[31]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/31
[32]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/32
[34]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/34
[35]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/35
[37]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/37
[41]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/41
[42]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/42
[43]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/43
[44]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/44
[45]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/45
[47]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/47
[48]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/48
[52]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/52
[53]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/53
[56]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/56
[57]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/57
[61]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/61
[64]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/64
[65]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/65
[67]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/67
[70]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/70
[71]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/71
[72]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/72
[73]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/73
[90]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/90
[93]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/93
[94]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/94
[95]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/95
[152]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/152
[153]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/153
[174]: https://github.com/applifting-vsecourse/tym-3-hobbyhub/issues/174
