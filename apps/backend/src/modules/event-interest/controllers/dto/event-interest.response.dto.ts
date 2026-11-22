import {
  EventInterestState,
  INTEREST_RULE_VIOLATIONS,
  InterestRuleViolation,
} from '@/modules/event-interest/domain/event-interest';
import { ApiProperty } from '@nestjs/swagger';

// #231: only ever about the signed-in person; nothing about anyone else who
// saved the event, nor how many did (visibility matrix).
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

  static fromDomain(state: EventInterestState): EventInterestStateResponseDto {
    return { isSaved: state.isSaved, violations: state.violations };
  }
}
