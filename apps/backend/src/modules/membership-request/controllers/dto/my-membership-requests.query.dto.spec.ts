import { membershipRequestsValidationPipe } from '@/modules/membership-request/controllers/membership-requests-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { MyMembershipRequestsQueryDto } from './my-membership-requests.query.dto';

// What the endpoint does with the query string before the handler sees it.
const validate = (
  query: Record<string, unknown>,
): Promise<MyMembershipRequestsQueryDto> =>
  membershipRequestsValidationPipe.transform(query, {
    type: 'query',
    metatype: MyMembershipRequestsQueryDto,
  }) as Promise<MyMembershipRequestsQueryDto>;

describe('MyMembershipRequestsQueryDto', () => {
  it.each(['pending', 'history'])('accepts the %s section', async (section) => {
    await expect(validate({ section, cursor: 'r9' })).resolves.toEqual({
      section,
      cursor: 'r9',
    });
  });

  it.each([{}, { section: 'approved' }])(
    'refuses a missing or unknown section: %o',
    async (query) => {
      await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
