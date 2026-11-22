import { EventInterestStateResponseDto } from './event-interest.response.dto';

// Visibility matrix (#231, #232): the list and the watching are their owner's
// alone. The answer is about the person asking and nothing else: never who
// else saved or watches the event, nor how many do.
describe('EventInterestStateResponseDto', () => {
  it("carries only the asking person's own state", () => {
    const response = EventInterestStateResponseDto.fromDomain({
      isSaved: true,
      violations: [],
      isWatching: true,
      watchViolations: [],
    });

    expect(Object.keys(response).sort()).toEqual([
      'isSaved',
      'isWatching',
      'violations',
      'watchViolations',
    ]);
  });
});
