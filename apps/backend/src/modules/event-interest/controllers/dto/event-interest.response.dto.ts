import {
  EventInterestState,
  INTEREST_RULE_VIOLATIONS,
  InterestRuleViolation,
  WATCH_RULE_VIOLATIONS,
  WatchRuleViolation,
} from '@/modules/event-interest/domain/event-interest';
import { ApiProperty } from '@nestjs/swagger';

// #231, #232: only ever about the signed-in person; nothing about anyone else
// who saved or watches the event, nor how many do (visibility matrix).
export class EventInterestStateResponseDto {
  @ApiProperty({
    description: 'The event is on the signed-in user\'s "Zajímá mě" list',
  })
  isSaved!: boolean;

  @ApiProperty({
    enum: INTEREST_RULE_VIOLATIONS,
    isArray: true,
    description: 'Why saving the event is refused now; empty when allowed',
  })
  violations!: InterestRuleViolation[];

  @ApiProperty({
    description:
      'The signed-in user watches the event for a free seat (#232); only ever on a saved event',
  })
  isWatching!: boolean;

  @ApiProperty({
    enum: WATCH_RULE_VIOLATIONS,
    isArray: true,
    description:
      'Why watching the event for a free seat is refused now; empty when allowed (the event is full and that is the only reason the user cannot ask to join). Stopping is never refused',
  })
  watchViolations!: WatchRuleViolation[];

  static fromDomain(state: EventInterestState): EventInterestStateResponseDto {
    return {
      isSaved: state.isSaved,
      violations: state.violations,
      isWatching: state.isWatching,
      watchViolations: state.watchViolations,
    };
  }
}
