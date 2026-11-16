import { Injectable } from '@nestjs/common';

// #227, ADR-0026: what other modules ask about friendships. Empty until the
// first use: #225 adds where two people stand (from the repository's
// `areFriends` and `findPendingRequestBetween`) and sending a request, #228
// deciding it, #226 the list of friends.
@Injectable()
export class FriendshipService {}
