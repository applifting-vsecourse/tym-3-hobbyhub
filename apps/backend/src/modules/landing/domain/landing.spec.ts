import {
  candidateLimitOf,
  LANDING_EVENTS_PER_ROW,
  LANDING_GROUPS_PER_ROW,
  LANDING_ROW_ORDER,
  lastMinuteUntil,
  pickRows,
  pragueDayOf,
  todayOf,
  trendingSince,
  weekendOf,
} from './landing';

const ids = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);

describe('landing rows', () => {
  describe('candidateLimitOf', () => {
    const order = LANDING_ROW_ORDER.member;

    it('asks the first row for one row of candidates', () => {
      expect(candidateLimitOf(order, 'lastMinute')).toBe(
        LANDING_EVENTS_PER_ROW,
      );
    });

    it('asks a later row for enough to stay full after the rows above', () => {
      // lastMinute, top, liked, friends are above; near repeats and does not count.
      expect(candidateLimitOf(order, 'today')).toBe(LANDING_EVENTS_PER_ROW * 5);
    });

    it('counts only rows of the same kind above a group row', () => {
      expect(candidateLimitOf(order, 'trendingGroups')).toBe(
        LANDING_GROUPS_PER_ROW * 2,
      );
    });

    it('asks "near" for one row: it neither skips nor takes', () => {
      expect(candidateLimitOf(order, 'near')).toBe(LANDING_EVENTS_PER_ROW);
    });
  });

  describe('pickRows', () => {
    it('keeps an event only in the first row from the top it fits', () => {
      const rows = pickRows(
        ['lastMinute', 'today'],
        new Map([
          ['lastMinute', ['a', 'b']],
          ['today', ['a', 'b', 'c', 'd', 'e', 'f']],
        ]),
      );
      expect(rows).toEqual([
        { kind: 'lastMinute', status: 'ok', ids: ['a', 'b'] },
        { kind: 'today', status: 'ok', ids: ['c', 'd', 'e', 'f'] },
      ]);
    });

    it('lets "near" repeat an event and take nothing from the rows below', () => {
      const rows = pickRows(
        ['lastMinute', 'near', 'today'],
        new Map([
          ['lastMinute', ['a']],
          ['near', ['a', 'b']],
          ['today', ['b', 'c']],
        ]),
      );
      expect(rows).toEqual([
        { kind: 'lastMinute', status: 'ok', ids: ['a'] },
        { kind: 'near', status: 'ok', ids: ['a', 'b'] },
        { kind: 'today', status: 'ok', ids: ['b', 'c'] },
      ]);
    });

    it('cuts a row to its size', () => {
      const [events] = pickRows(['top'], new Map([['top', ids('e', 10)]]));
      const [groups] = pickRows(
        ['trendingGroups'],
        new Map([['trendingGroups', ids('g', 10)]]),
      );
      expect(events).toMatchObject({ ids: ids('e', LANDING_EVENTS_PER_ROW) });
      expect(groups).toMatchObject({ ids: ids('g', LANDING_GROUPS_PER_ROW) });
    });

    it('leaves out a row with nothing left, and one that was not asked', () => {
      const rows = pickRows(
        ['lastMinute', 'friends', 'today'],
        new Map([
          ['lastMinute', ['a']],
          ['today', ['a']],
        ]),
      );
      expect(rows).toEqual([{ kind: 'lastMinute', status: 'ok', ids: ['a'] }]);
    });

    it('keeps a failed row in its place, so the page can retry it', () => {
      const rows = pickRows(
        ['lastMinute', 'top'],
        new Map([
          ['lastMinute', null],
          ['top', ['a']],
        ]),
      );
      expect(rows).toEqual([
        { kind: 'lastMinute', status: 'error' },
        { kind: 'top', status: 'ok', ids: ['a'] },
      ]);
    });
  });

  describe('days in Prague', () => {
    it('reads the day in Prague, not in UTC', () => {
      // 23:30 UTC on 21 Nov is 00:30 on 22 Nov in Prague.
      expect(pragueDayOf(new Date('2026-11-21T23:30:00Z'))).toBe('2026-11-22');
    });

    it('gives today as a one-day range', () => {
      expect(todayOf(new Date('2026-11-19T15:00:00Z'))).toEqual({
        dateFrom: '2026-11-19',
        dateTo: '2026-11-19',
      });
    });

    it('takes the coming Saturday and Sunday on a weekday', () => {
      // Thursday
      expect(weekendOf(new Date('2026-11-19T15:00:00Z'))).toEqual({
        dateFrom: '2026-11-21',
        dateTo: '2026-11-22',
      });
    });

    it('takes this weekend on a Saturday and only Sunday on a Sunday', () => {
      expect(weekendOf(new Date('2026-11-21T10:00:00Z'))).toEqual({
        dateFrom: '2026-11-21',
        dateTo: '2026-11-22',
      });
      expect(weekendOf(new Date('2026-11-22T10:00:00Z'))).toEqual({
        dateFrom: '2026-11-22',
        dateTo: '2026-11-22',
      });
    });

    it('crosses a month end', () => {
      // Monday 30 Nov
      expect(weekendOf(new Date('2026-11-30T10:00:00Z'))).toEqual({
        dateFrom: '2026-12-05',
        dateTo: '2026-12-06',
      });
    });
  });

  it('counts last minute four hours ahead and trending thirty days back', () => {
    const now = new Date('2026-11-19T15:00:00Z');
    expect(lastMinuteUntil(now)).toEqual(new Date('2026-11-19T19:00:00Z'));
    expect(trendingSince(now)).toEqual(new Date('2026-10-20T15:00:00Z'));
  });
});
