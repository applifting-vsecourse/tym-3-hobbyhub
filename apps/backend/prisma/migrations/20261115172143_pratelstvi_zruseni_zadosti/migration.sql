-- #225, ADR-0023: odesílatel smí čekající žádost o přátelství zrušit. Zrušená
-- žádost zůstává jako záznam (decidedAt = kdy byla zrušena, CHECK
-- friend_request_decided_at), aby se pokusy daly počítat do limitu
-- upozornění. Novou žádost mezi stejnými lidmi neblokuje.

-- AlterEnum
ALTER TYPE "friend_request_status" ADD VALUE 'WITHDRAWN';
