// The "Zajímá mě" list (#231) against a real PostgreSQL: the uniqueness that
// keeps a double tap to one row, and the SQL that leaves out what the person
// may no longer see. Like the schema specs it only runs on request:
//   DB_TESTS=1 pnpm backend test event-interest.repository
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  EventVisibility,
  Prisma,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { EventInterestRepository } from './event-interest.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('EventInterestRepository', () => {
  const prisma = new PrismaService();
  const repository = new EventInterestRepository(prisma);
  const now = new Date('2030-01-10T12:00:00Z');
  const page = { limit: 10, offset: 0 };
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    groupIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
    // Events first (interests go with them), then groups, then people.
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    await prisma.group.deleteMany({ where: { id: { in: created.groupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.activity.deleteMany({
      where: { categoryId: { in: created.categoryIds } },
    });
    await prisma.activityCategory.deleteMany({
      where: { id: { in: created.categoryIds } },
    });
    created.eventIds = [];
    created.userIds = [];
    created.groupIds = [];
    created.categoryIds = [];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const random = (): string => Math.random().toString(36).slice(2);

  const aUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name: 'Test',
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.userIds.push(user.id);
    return user.id;
  };

  const anActivity = async (): Promise<string> => {
    const category = await prisma.activityCategory.create({
      data: {
        name: `cat-${random()}`,
        icon: `cat-${random()}`,
        order: Math.floor(Math.random() * 2_000_000_000),
      },
    });
    created.categoryIds.push(category.id);
    const activity = await prisma.activity.create({
      data: {
        name: `act-${random()}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 4,
      },
    });
    return activity.id;
  };

  const anEvent = async (
    organizerId: string,
    activityId: string,
    override: Partial<Prisma.EventUncheckedCreateInput> & { day: number },
  ): Promise<string> => {
    const { day, ...data } = override;
    const startAt = new Date(Date.UTC(2030, 0, day, 18));
    const event = await prisma.event.create({
      data: {
        title: 'Test',
        description: 'Test',
        status: EventStatus.PUBLISHED,
        venueType: VenueType.PLACE,
        startAt,
        endAt: new Date(startAt.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 4,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId,
        organizerId,
        ...data,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  it('keeps one row when the same event is saved twice at once', async () => {
    const [organizer, me, activity] = await Promise.all([
      aUser(),
      aUser(),
      anActivity(),
    ]);
    const eventId = await anEvent(organizer, activity, { day: 20 });

    await Promise.all([
      repository.save(me, eventId),
      repository.save(me, eventId),
    ]);
    await repository.save(me, eventId);

    expect(await prisma.eventInterest.count({ where: { eventId } })).toBe(1);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: true,
      isWatching: false,
    });

    await repository.remove(me, eventId);
    await repository.remove(me, eventId);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: false,
      isWatching: false,
    });
  });

  // #232: watching is a column of the saved row.
  it('saves the event when watching starts, keeps it when it stops', async () => {
    const [organizer, me, activity] = await Promise.all([
      aUser(),
      aUser(),
      anActivity(),
    ]);
    const eventId = await anEvent(organizer, activity, { day: 20 });

    await Promise.all([
      repository.watch(me, eventId),
      repository.watch(me, eventId),
    ]);
    expect(await prisma.eventInterest.count({ where: { eventId } })).toBe(1);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: true,
      isWatching: true,
    });
    expect((await repository.getPage(me, now, page)).items).toEqual([
      { eventId, status: 'PUBLISHED', watchesFreeSpot: true },
    ]);

    await repository.unwatch(me, eventId);
    await repository.unwatch(me, eventId);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: true,
      isWatching: false,
    });

    // Saving again leaves the watching as it is; removing takes it along.
    await repository.watch(me, eventId);
    await repository.save(me, eventId);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: true,
      isWatching: true,
    });
    await repository.remove(me, eventId);
    expect(await repository.getRow(me, eventId)).toEqual({
      isSaved: false,
      isWatching: false,
    });
  });

  // #232: whom the event module tells about a free seat: only who could
  // still ask for it. A waiting or rejected request (ADR-0013) leaves the
  // watcher out even if the flag stayed on.
  it('finds the people watching who have no seat and no request', async () => {
    const [organizer, watcher, seated, saver, waiting, rejected, activity] =
      await Promise.all([
        aUser(),
        aUser(),
        aUser(),
        aUser(),
        aUser(),
        aUser(),
        anActivity(),
      ]);
    const eventId = await anEvent(organizer, activity, { day: 20 });
    for (const userId of [watcher, seated, waiting, rejected]) {
      await repository.watch(userId, eventId);
    }
    await repository.save(saver, eventId);
    await prisma.participation.create({
      data: { eventId, userId: seated, status: 'APPROVED' },
    });
    await prisma.participationRequest.createMany({
      data: [
        { eventId, userId: waiting, status: 'PENDING' },
        { eventId, userId: rejected, status: 'REJECTED', decidedAt: now },
      ],
    });

    await expect(
      new EventRepository(prisma).getFreeSpotWatcherIds(eventId),
    ).resolves.toEqual([watcher]);
  });

  it('lists what is still on soonest first, then the rest latest first', async () => {
    const [organizer, me, activity] = await Promise.all([
      aUser(),
      aUser(),
      anActivity(),
    ]);
    const later = await anEvent(organizer, activity, { day: 25 });
    const sooner = await anEvent(organizer, activity, { day: 15 });
    const cancelled = await anEvent(organizer, activity, {
      day: 20,
      status: EventStatus.CANCELLED,
      cancelledAt: now,
    });
    const longAgo = await anEvent(organizer, activity, {
      day: 1,
      status: EventStatus.FINISHED,
    });
    const lastWeek = await anEvent(organizer, activity, { day: 5 });
    const draft = await anEvent(organizer, activity, {
      day: 22,
      status: EventStatus.DRAFT,
    });
    for (const eventId of [later, sooner, cancelled, longAgo, lastWeek, draft])
      await repository.save(me, eventId);
    // Someone else's list is not mine.
    const someoneElse = await aUser();
    const theirs = await anEvent(organizer, activity, { day: 16 });
    await repository.save(someoneElse, theirs);

    const result = await repository.getPage(me, now, page);

    expect(result.items).toEqual([
      { eventId: sooner, status: 'PUBLISHED', watchesFreeSpot: false },
      { eventId: later, status: 'PUBLISHED', watchesFreeSpot: false },
      { eventId: cancelled, status: 'CANCELLED', watchesFreeSpot: false },
      { eventId: lastWeek, status: 'PUBLISHED', watchesFreeSpot: false },
      { eventId: longAgo, status: 'FINISHED', watchesFreeSpot: false },
    ]);
    expect(result.total).toBe(5);
  });

  it('leaves out, also from the total, what the person may no longer see', async () => {
    const [organizer, blocked, me, activity] = await Promise.all([
      aUser(),
      aUser(),
      aUser(),
      anActivity(),
    ]);
    const group = await prisma.group.create({
      data: { name: 'Test', description: 'Test', activityId: activity },
    });
    created.groupIds.push(group.id);
    const visible = await anEvent(organizer, activity, { day: 15 });
    const hidden = await anEvent(organizer, activity, {
      day: 16,
      isHidden: true,
      hiddenAt: now,
      hiddenReason: 'Skryto správcem v testu.',
    });
    const groupOnly = await anEvent(organizer, activity, {
      day: 17,
      visibility: EventVisibility.GROUP_ONLY,
      groupId: group.id,
    });
    const ofBlocked = await anEvent(blocked, activity, { day: 18 });
    for (const eventId of [visible, hidden, groupOnly, ofBlocked])
      await repository.save(me, eventId);

    const outside = await repository.getPage(me, now, page, {
      activityIds: [],
      hiddenOrganizerIds: [blocked],
    });
    expect(outside).toEqual({
      items: [
        { eventId: visible, status: 'PUBLISHED', watchesFreeSpot: false },
      ],
      total: 1,
    });

    // Back in the group, the group-only event is back on the list: the row
    // stayed.
    await prisma.groupMembership.create({
      data: { groupId: group.id, userId: me },
    });
    const member = await repository.getPage(me, now, page, {
      activityIds: [],
      hiddenOrganizerIds: [blocked],
    });
    expect(member.items.map((item) => item.eventId)).toEqual([
      visible,
      groupOnly,
    ]);
    expect(member.total).toBe(2);
  });

  it('narrows the list by the filter of the event list', async () => {
    const [organizer, me, activity, other] = await Promise.all([
      aUser(),
      aUser(),
      anActivity(),
      anActivity(),
    ]);
    const florbal = await anEvent(organizer, activity, {
      day: 15,
      title: 'Florbal v Kobylisích',
    });
    const chess = await anEvent(organizer, other, {
      day: 16,
      title: 'Šachy',
    });
    await repository.save(me, florbal);
    await repository.save(me, chess);

    expect(
      await repository.getPage(me, now, page, {
        activityIds: [],
        search: 'kobylisich',
      }),
    ).toEqual({
      items: [
        { eventId: florbal, status: 'PUBLISHED', watchesFreeSpot: false },
      ],
      total: 1,
    });
    expect(
      await repository.getPage(me, now, page, { activityIds: [other] }),
    ).toEqual({
      items: [{ eventId: chess, status: 'PUBLISHED', watchesFreeSpot: false }],
      total: 1,
    });
  });
});
