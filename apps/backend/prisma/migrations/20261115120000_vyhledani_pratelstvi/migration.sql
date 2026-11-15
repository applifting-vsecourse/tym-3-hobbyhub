-- #225, ADR-0023: vyhledání lidí podle jména nebo přezdívky bez ohledu na
-- diakritiku („simon“ najde „Šimon“). unaccent je standardní rozšíření
-- PostgreSQL (contrib); schéma Prisma o něm neví, používá ho jen dotaz
-- vyhledávání ve FriendshipRepository.
CREATE EXTENSION IF NOT EXISTS unaccent;
