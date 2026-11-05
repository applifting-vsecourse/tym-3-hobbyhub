import { ApplicationFacts } from '@/modules/participation-request/domain/participation-request';
import { applicationStatusOf } from './my-events';

const facts = (override: Partial<ApplicationFacts>): ApplicationFacts => ({
  eventStatus: 'PUBLISHED',
  seat: null,
  requests: [],
  ...override,
});

describe('applicationStatusOf', () => {
  it.each<[Partial<ApplicationFacts>, string]>([
    [{ requests: ['PENDING'] }, 'PENDING'],
    [{ seat: 'APPROVED', requests: ['APPROVED'] }, 'APPROVED'],
    [{ requests: ['REJECTED'] }, 'REJECTED'],
    [{ requests: ['WITHDRAWN'] }, 'WITHDRAWN'],
    [{ seat: 'CANCELLED', requests: ['APPROVED'] }, 'WITHDRAWN'],
    [{ requests: ['CLOSED'] }, 'EVENT_CANCELLED'],
  ])('maps %j to %s', (override, expected) => {
    expect(applicationStatusOf(facts(override))).toBe(expected);
  });

  it('tells a cancelled event over a seat, a waiting request or a closed one', () => {
    const overrides: Partial<ApplicationFacts>[] = [
      { seat: 'APPROVED' },
      { requests: ['PENDING'] },
      { requests: ['CLOSED'] },
    ];
    for (const override of overrides) {
      expect(
        applicationStatusOf(facts({ eventStatus: 'CANCELLED', ...override })),
      ).toBe('EVENT_CANCELLED');
    }
  });

  it('keeps the outcome of someone who had left or been rejected before the cancellation', () => {
    expect(
      applicationStatusOf(
        facts({ eventStatus: 'CANCELLED', requests: ['REJECTED'] }),
      ),
    ).toBe('REJECTED');
    expect(
      applicationStatusOf(
        facts({ eventStatus: 'CANCELLED', seat: 'CANCELLED' }),
      ),
    ).toBe('WITHDRAWN');
  });

  it('prefers a new waiting request over an old sign-off', () => {
    expect(
      applicationStatusOf(
        facts({ seat: 'CANCELLED', requests: ['APPROVED', 'PENDING'] }),
      ),
    ).toBe('PENDING');
  });

  it('shows nothing without an application', () => {
    expect(applicationStatusOf(facts({}))).toBeNull();
  });
});
