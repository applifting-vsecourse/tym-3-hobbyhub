import { foldForSearch, searchWords } from './fold-for-search';

describe('foldForSearch', () => {
  it('lowers case, drops diacritics and outer spaces', () => {
    expect(foldForSearch('  Čtvrteční FLORBAL ')).toBe('ctvrtecni florbal');
  });
});

describe('searchWords', () => {
  it('splits a text into folded words', () => {
    expect(searchWords(' Volejbal  PRAHA-Žižkov ')).toEqual([
      'volejbal',
      'praha-zizkov',
    ]);
  });

  it('has no words for nothing or blanks', () => {
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
  });
});
