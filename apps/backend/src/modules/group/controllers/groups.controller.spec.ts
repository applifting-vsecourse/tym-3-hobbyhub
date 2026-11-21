import { GroupsService } from '@/modules/group/services/groups.service';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { GroupsController } from './groups.controller';
import { CreateGroupDto } from './dto/create-group.dto';

describe('GroupsController', () => {
  // The controller copies the body field by field, so a field it forgets is
  // dropped without a word: the DTO validates it and the form sends it.
  it('hands every field of a new group, the tagline too, to the service', async () => {
    const service = mock<GroupsService>();
    const controller = new GroupsController(service);
    const body: CreateGroupDto = {
      name: 'Pražští volejbalisté',
      activityId: 'a1',
      description: 'Hrajeme každý čtvrtek.',
      tagline: 'Síť, písek a dobrá nálada 🏐',
      locationName: 'Praha 8',
      latitude: 50.1,
      longitude: 14.4,
      usualSchedule: 'čtvrtky 18:00',
      approvalMode: 'OPEN',
      meetingDays: [4],
    };

    await controller
      .create({ id: 'u1' } as Identity, body)
      .catch(() => undefined);

    expect(service.createGroup).toHaveBeenCalledWith(
      { id: 'u1' },
      expect.objectContaining(body),
    );
  });
});
