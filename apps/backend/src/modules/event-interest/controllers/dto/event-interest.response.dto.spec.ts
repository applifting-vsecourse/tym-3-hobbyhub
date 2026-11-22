import { EventInterestStateResponseDto } from './event-interest.response.dto';

// Visibility matrix (#231): the list is its owner's alone. The answer is about
// the person asking and nothing else: never who else saved the event, nor how
// many did.
describe('EventInterestStateResponseDto', () => {
  it("carries only the asking person's own state", () => {
    const response = EventInterestStateResponseDto.fromDomain({
      isSaved: true,
      violations: [],
    });

    expect(Object.keys(response).sort()).toEqual(['isSaved', 'violations']);
  });
});
