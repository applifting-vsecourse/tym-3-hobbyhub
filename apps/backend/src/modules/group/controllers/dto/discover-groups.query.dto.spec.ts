import { groupsValidationPipe } from '@/modules/group/controllers/groups-validation.pipe';
import { DiscoverGroupsQueryDto } from './discover-groups.query.dto';

const parse = (
  query: Record<string, unknown>,
): Promise<DiscoverGroupsQueryDto> =>
  groupsValidationPipe.transform(query, {
    type: 'query',
    metatype: DiscoverGroupsQueryDto,
  }) as Promise<DiscoverGroupsQueryDto>;

describe('DiscoverGroupsQueryDto', () => {
  it('takes no filter as none', async () => {
    const query = await parse({});
    expect(query.activityIds).toEqual([]);
    expect(query.search).toBeUndefined();
  });

  it('takes one activity as a list', async () => {
    expect((await parse({ activityIds: 'a1' })).activityIds).toEqual(['a1']);
  });

  it('refuses a text that is too long', async () => {
    await expect(parse({ search: 'x'.repeat(101) })).rejects.toBeDefined();
    await expect(parse({ location: 'x'.repeat(101) })).rejects.toBeDefined();
  });
});
