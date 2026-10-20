---
name: review-PR
description: Kompletní review pull requestu v tomto repu podle čísla PR — přiřadí uživatele jako reviewera, ověří podmínky merge (aktuální base větev, zelené CI, bez konfliktů), zkontroluje změny proti konvencím v CLAUDE.md a DESIGN.md, napíše review na GitHub (schválení, nebo žádost o opravu) a nakonec nabídne merge za autora. Použij vždy, když uživatel napíše "/review-PR <číslo>", "udělej review PR 117", "zreviduj #112", "mrkni na ten PR", "můžu to mergnout?", "je PR 109 připravený k merge?" nebo chce PR schválit, okomentovat či mergnout — i když slovo review nezazní.
argument-hint: <číslo PR>
---

# Review PR

Číslo PR: `$ARGUMENTS`. Když chybí, zeptej se, který PR revidovat (`gh pr list` ukáže otevřené).

Cíl: jedno review, po kterém autor i zbytek týmu vidí na GitHubu, kdo PR revidoval, s jakým výsledkem a co má případně opravit. Skill nic nepíše do pracovního stromu: PR čte přes `gh` a `git show`, neprovádí `gh pr checkout`, aby nerozbil rozdělanou práci uživatele.

Všechno, co jde na GitHub (review, komentáře), piš **česky** — tak tým komunikuje v commitech i PR.

## 1. Načti PR a přiřaď se jako reviewer

```bash
gh pr view <n> --json number,title,author,baseRefName,headRefName,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,files,additions,deletions,body,url
gh api user -q .login
```

- Když je autor PR sám uživatel, řekni to a skonči: GitHub nedovolí schválit vlastní PR a review by neměl význam.
- Když je PR `isDraft`, upozorni na to a pokračuj jen po souhlasu uživatele — autor ho ještě nepovažuje za hotový.
- Přiřaď uživatele jako reviewera, aby ostatní viděli, že se PR někdo ujal:

```bash
gh pr edit <n> --add-reviewer <login>
```

Pokud už je uživatel mezi reviewery, příkaz nic nerozbije. Chyba typu „Review cannot be requested from pull request author“ znamená bod výše.

## 2. Ověř podmínky merge

Tyto kontroly rozhodují o kroku 6, proto je proveď dřív než vlastní review a výsledek si zapiš.

**Aktuálnost base větve.** Tým udržuje větve mergem base větve do feature větve (viz `Merge branch 'main' into …` v historii). Base nemusí být `main` — stacked PR má base jinou feature větev, kontroluj proto `baseRefName` z kroku 1:

```bash
git fetch origin <base> <head>
git merge-base --is-ancestor origin/<base> origin/<head> && echo "aktuální" || echo "ZAOSTÁVÁ za base"
```

`mergeStateStatus` z GitHubu je tu jen nápověda: `BEHIND` znamená totéž co lokální kontrola, `BLOCKED` typicky čeká na CI nebo review. Lokální `merge-base` je rozhodující, protože ukáže i to, o jaké commity větev zaostává (`git log --oneline origin/<head>..origin/<base>`). Repo vyžaduje aktuální větev i při merge: `gh pr merge` na zaostávající větvi selže s „the head branch is not up to date with the base branch“, proto má krok 5 aktualizaci větve.

**Konflikty.** `mergeable` musí být `MERGEABLE`. `CONFLICTING` je blokující; `UNKNOWN` znamená, že GitHub ještě počítá — zopakuj `gh pr view` po chvíli.

**CI.** V `statusCheckRollup` je job `verify` z workflow CI (lint, type-check, testy, build, kontrola pořadí a neměnnosti migrací). Zelené = `status: COMPLETED` a `conclusion: SUCCESS`. Když běží, počkej a zkontroluj znovu; když selhal, zjisti proč:

```bash
gh pr checks <n>
gh run view <run-id> --log-failed
```

Padlé `Check migrations order` nebo `Check migrations on base branch are unchanged` má v CLAUDE.md popsaný postup (`scripts/rebase-migrations.sh`, skill `rebase-migrations`) — do komentáře autorovi odkaž přímo na něj, ať nemusí hledat.

**Base větev.** Když base není `main`, napiš to uživateli: merge do jiné feature větve je v pořádku, ale do produkce se změna dostane až s nadřazeným PR.

Výsledek shrň v jedné tabulce (aktuální base / konflikty / CI / draft), aby bylo na první pohled vidět, co brání merge.

## 3. Proveď review

Čti diff, ne jen názvy souborů:

```bash
gh pr diff <n>
git show origin/<head>:<cesta>   # celý soubor, když diff nestačí pro kontext
```

Když je v session dostupný skill `code-review`, použij `/code-review <n>` jako první průchod na chyby v logice — ale neskonči u něj: konvence tohoto repa zná jen CLAUDE.md a DESIGN.md, obojí si před review přečti.

Na co se dívat, v pořadí důležitosti:

1. **Správnost.** Chyby v logice, chybějící ošetření stavů, bezpečnost (kdo je aktér — vždy ze session přes `@User()`, nikdy z těla požadavku), data z jiného modulu jen přes jeho _service_.
2. **Vrstvy backendu.** `domain/` bez Nestu a Prismy, Prisma jen v `repositories/`, pravidla mezi poli entity jako čisté funkce v `domain/`, DTO s limity čtenými z `domain/`, CHECK constrainty v migraci.
3. **Migrace.** Nová migrace musí být časově za všemi na base větvi a žádná existující nesmí být upravená. Opravy jen novou migrací.
4. **Frontend konvence.** Formuláře přes `AppForm`, ovládací prvky z `src/components/ui/` (ne ručně psané), žádné `shadow-*` na inputech a kartách, texty v obou překladech (`cs` i `en`), čísla a data přes `Intl`.
5. **DESIGN.md.** Žádné generické vnořené karty; obrazovka drží vzor, který soubor předepisuje.
6. **Testy.** Nová logika v `domain/` a `services/` má test; guarded formuláře se testují přes `renderWithRouter`.
7. **Zadání.** Odpovídá změna tomu, co PR v popisu a názvu slibuje? Nic navíc, nic chybějícího.

Rozděl nálezy na dvě hromádky:

- **Blokující** — chyba v chování, bezpečnostní díra, porušení pravidla z CLAUDE.md/DESIGN.md, upravená zmrazená migrace, chybějící překlad (test na rozjeté překlady spadne), červené CI, větev za base o commity, které se týkají kódu aplikace (zaostávání jen o skill nebo dokumentaci řeší aktualizace větve v kroku 5), konflikt.
- **Neblokující** — styl, pojmenování, drobné zjednodušení, návrhy. Ty merge nebrzdí a autor je může přijmout nebo ne.

Styl, který uživatel nebo tým výslovně neřeší, nevymýšlej. Review má být krátké a konkrétní: soubor, řádek, co je špatně, co s tím.

## 4. Napiš review na GitHub

Review posílej jako skutečné GitHub review, ne jen jako komentář — uzavře tím request z kroku 1 a ostatní na seznamu PR uvidí stav (zelená fajfka / červený kříž).

Text review nejdřív ukaž uživateli a odešli až po jeho souhlasu: jde jeho jménem spoluhráči a zpátky se nebere.

**Nic blokujícího** → schválení s doporučením k merge. Neblokující poznámky přidej jako volitelné návrhy:

```bash
gh pr review <n> --approve --body "$(cat <<'MSG'
## Review

PR splňuje podmínky merge: větev je aktuální vůči `<base>`, CI zelené, bez konfliktů. Doporučuji mergnout.

### Volitelné návrhy
- `apps/frontend/src/features/.../Foo.tsx:42` — …
MSG
)"
```

**Něco blokujícího** → žádost o změny. U každého bodu soubor a řádek, proč to blokuje a co udělat. Když blokuje jen stav (zaostávající větev, červené CI), napiš to stejně — autor pak ví, že kód je jinak v pořádku:

```bash
gh pr review <n> --request-changes --body "$(cat <<'MSG'
## Review

Před mergem je potřeba opravit:

1. `apps/backend/src/modules/event/services/event.service.ts:57` — … (proč, co udělat)
2. Větev zaostává za `main` — prosím merge `main` do větve.

### Volitelné návrhy
- …

Po opravě dej vědět, projdu to znovu.
MSG
)"
```

Blokující poznámky k jednomu konkrétnímu řádku jdou lépe jako inline komentář (`gh api repos/{owner}/{repo}/pulls/<n>/reviews` s `comments[]`), ale souhrn v těle review stačí — autor ho uvidí vždy, inline komentáře se u přepsaných řádků ztrácí.

## 5. Nabídni merge

Jen když platí všechno najednou: review bylo schválení (žádný blokující nález), CI zelené, větev aktuální vůči base (nebo zaostává jen o commity mimo kód aplikace, viz níže), bez konfliktů, PR není draft. Jinak merge nenabízej a řekni, co chybí.

Zeptej se uživatele, jestli chce PR mergnout za autora.

**Aktualizace větve.** Když větev zaostává za base jen o commity, které se kódu netýkají (třeba skill nebo dokumentace), a uživatel přesto chce mergnout, GitHub merge odmítne, dokud větev není aktuální. Aktualizuj ji přes GitHub API — je to totéž co tlačítko „Update branch“, vznikne merge commit base větve do větve autora a lokální pracovní strom zůstane nedotčený:

```bash
gh api -X PUT repos/{owner}/{repo}/pulls/<n>/update-branch
```

Je to zápis do cizí větve, proto jen po výslovném souhlasu uživatele — řekni mu, že do větve autora přibude commit a CI poběží znovu. Po aktualizaci počkej na zelené CI (`gh pr checks <n> --watch`) a ověř, že `mergeStateStatus` je `CLEAN`; schválení z kroku 4 aktualizací nezaniká. Když větev zaostává o commity, které se kódu týkají, nech merge na autorovi: review má ověřit kombinaci, kterou CI otestovalo, a to je po aktualizaci na tobě.

Tým merguje merge commitem (`Merge pull request #…`), proto:

```bash
gh pr merge <n> --merge
```

Bez `--delete-branch`: repo větve po merge nemaže a není důvod to měnit za autora. Když uživatel merge odmítne, nic dalšího nedělej — review na GitHubu už stačí a autor si PR mergne sám.

Po merge zkontroluj `gh pr view <n> --json state,mergedAt` a oznam výsledek. Merge do `main` spouští workflow Build & Deploy na produkci — řekni to uživateli, aby věděl, co právě odstartoval.

## Shrnutí pro uživatele

Na konci stručně: tabulka podmínek merge, odkaz na review na GitHubu, počet blokujících a neblokujících nálezů a jestli byl PR mergnut. Nic z toho neopakuj do GitHub komentáře — tam patří jen to, co je užitečné autorovi.
