import {
  dueRatingPrompt,
  RatingPromptCandidate,
  ratingPromptHorizon,
  ratingPromptRecipients,
} from './rating-prompt';

const endAt = new Date('2026-11-10T20:00:00Z');
const HOUR = 60 * 60 * 1000;
const at = (hoursAfterEnd: number): Date =>
  new Date(endAt.getTime() + hoursAfterEnd * HOUR);

describe('dueRatingPrompt', () => {
  const due = (
    hoursAfterEnd: number,
    sent: ('FIRST' | 'LAST_CALL')[] = [],
  ): 'FIRST' | 'LAST_CALL' | null =>
    dueRatingPrompt({ endAt, sent }, at(hoursAfterEnd));

  it('sends nothing in the first two hours after the end', () => {
    expect(due(0)).toBeNull();
    expect(due(1.99)).toBeNull();
  });

  it('sends the first call two hours after the end, once', () => {
    expect(due(2)).toBe('FIRST');
    expect(due(2, ['FIRST'])).toBeNull();
  });

  it('still sends a first call that fell due during an outage', () => {
    expect(due(5 * 24)).toBe('FIRST');
  });

  it('sends the last call when the last day begins, once', () => {
    expect(due(6 * 24, ['FIRST'])).toBe('LAST_CALL');
    expect(due(6 * 24, ['FIRST', 'LAST_CALL'])).toBeNull();
  });

  it('skips the first call once the last one is due', () => {
    expect(due(6 * 24 + 1)).toBe('LAST_CALL');
  });

  it('sends nothing once the rating period is over', () => {
    expect(due(7 * 24)).toBe('LAST_CALL');
    expect(due(7 * 24 + 0.01)).toBeNull();
  });
});

describe('ratingPromptHorizon', () => {
  it('looks at events that ended between seven days and two hours ago', () => {
    const now = at(0);
    expect(ratingPromptHorizon(now)).toEqual({
      endedAfter: new Date(now.getTime() - 7 * 24 * HOUR),
      endedBefore: new Date(now.getTime() - 2 * HOUR),
    });
  });
});

describe('ratingPromptRecipients', () => {
  const anEvent = (
    overrides: Partial<RatingPromptCandidate> = {},
  ): RatingPromptCandidate => ({
    id: 'e1',
    endAt,
    organizerId: 'org',
    coOrganizerIds: ['co'],
    seats: [
      { userId: 'org', status: 'APPROVED' },
      { userId: 'co', status: 'APPROVED' },
      { userId: 'came', status: 'ATTENDED' },
      { userId: 'missed', status: 'NO_SHOW' },
      { userId: 'left', status: 'CANCELLED' },
      { userId: 'waiting', status: 'WAITLISTED' },
    ],
    sent: [],
    ratedOrganizer: [],
    ratedByOrganizer: [],
    ...overrides,
  });

  it('calls everyone with a seat, whether they came or not, and the organizer', () => {
    expect(ratingPromptRecipients(anEvent(), 'FIRST', [])).toEqual({
      organizerId: 'org',
      participantIds: ['came', 'missed'],
    });
  });

  it('leaves out people blocked from the organizer', () => {
    expect(ratingPromptRecipients(anEvent(), 'FIRST', ['missed'])).toEqual({
      organizerId: 'org',
      participantIds: ['came'],
    });
  });

  it('calls no organizer of an event nobody had a seat at', () => {
    const event = anEvent({ seats: [{ userId: 'org', status: 'APPROVED' }] });
    expect(ratingPromptRecipients(event, 'FIRST', [])).toEqual({
      organizerId: null,
      participantIds: [],
    });
  });

  it('calls at the last day only those with someone left to rate', () => {
    const event = anEvent({
      ratedOrganizer: ['came'],
      ratedByOrganizer: ['came'],
    });
    expect(ratingPromptRecipients(event, 'LAST_CALL', [])).toEqual({
      organizerId: 'org',
      participantIds: ['missed'],
    });
    const allRated = anEvent({
      ratedOrganizer: ['came', 'missed'],
      ratedByOrganizer: ['came', 'missed'],
    });
    expect(ratingPromptRecipients(allRated, 'LAST_CALL', [])).toEqual({
      organizerId: null,
      participantIds: [],
    });
  });
});
