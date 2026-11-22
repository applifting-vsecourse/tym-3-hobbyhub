-- #223: skupina si může napsat krátký vlastní popisek pod název (i s emoji).

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "tagline" VARCHAR(120);

-- Počítá se ve znacích jako u ostatních textů, ne v jednotkách UTF-16.
ALTER TABLE "group"
  ADD CONSTRAINT "group_tagline_length"
  CHECK ("tagline" IS NULL OR char_length("tagline") <= 120);
