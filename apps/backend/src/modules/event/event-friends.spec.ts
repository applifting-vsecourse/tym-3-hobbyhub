// The events of friends (#226, ADR-0026) against a real PostgreSQL, because
// which events a friend's profile, „Akce přátel“ and the detail show is a
// Prisma `where`. Like the schema specs it only runs on request:
//   DB_TESTS=1 pnpm backend test event-friends
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  EventVisibility,
  ParticipationStatus,
  RequestStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventPeriod, EventViewerScope } from './domain/event';
import { EventRepository } from './repositories/event.repository';

// ADR-0022: hidden means since when and why (CHECK event_hidden_all_or_nothing).
const HIDDEN = {
  isHidden: true,
  hiddenAt: new Date('2030-01-01T00:00:00Z'),
  hiddenReason: 'Skryto správcem v testu.',
} as const;

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('EventRepository: events of friends (#226)', () => {
  const prisma = new PrismaService();
  const repository = new EventRepository(prisma);
  // Events take place on day N of January 2030, 18:00–20:00 UTC.
  const now = new Date('2030-01-10T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    groupIds: [] as string[],
    categoryIds: [] as string[],
  };
  let activityId: string;

  afterEach(async () => {
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

  const aUser = async (name = 'Test'): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name,
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.userIds.push(user.id);
    return user.id;
  };

  beforeEach(async () => {
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
    activityId = activity.id;
  });

  const aGroup = async (): Promise<string> => {
    const group = await prisma.group.create({
      data: { name: `group-${random()}`, description: 'Test', activityId },
    });
    created.groupIds.push(group.id);
    return group.id;
  };

  const anEvent = async (
    organizerId: string,
    day: number,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const start = new Date(Date.UTC(2030, 0, day, 18));
    const event = await prisma.event.create({
      data: {
        title: `Test ${day}`,
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.MANUAL,
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 4,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId,
        organizerId,
        ...extra,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const seat = async (
    eventId: string,
    userId: string,
    status: ParticipationStatus = ParticipationStatus.APPROVED,
  ): Promise<void> => {
    await prisma.participation.create({
      data: {
        eventId,
        userId,
        status,
        ...(status === ParticipationStatus.WAITLISTED && {
          waitlistPosition: 1,
        }),
      },
    });
  };

  const scopeOf = (
    userId: string,
    extra: Partial<EventViewerScope> = {},
  ): EventViewerScope => ({
    userId,
    groupIds: [],
    hiddenOrganizerIds: [],
    ...extra,
  });

  const idsOf = async (
    peopleIds: string[],
    viewer: EventViewerScope,
    period: EventPeriod = 'upcoming',
  ): Promise<string[]> => {
    const page = await repository.getEventsWithPeople(
      peopleIds,
      { period, now, viewer },
      { limit: 10, offset: 0 },
    );
    return page.items.map((event) => event.id);
  };

  it('lists events with an approved seat or organized, soonest first', async () => {
    const viewer = await aUser();
    const friend = await aUser();
    const host = await aUser();
    const going = await anEvent(host, 14);
    await seat(going, friend);
    const organized = await anEvent(friend, 12);
    const coOrganized = await anEvent(host, 16, {
      coOrganizers: { connect: { id: friend } },
    });
    const waitlisted = await anEvent(host, 17);
    await seat(waitlisted, friend, ParticipationStatus.WAITLISTED);
    const requested = await anEvent(host, 18);
    await prisma.participationRequest.create({
      data: { eventId: requested, userId: friend },
    });
    const cancelledSeat = await anEvent(host, 19);
    await seat(cancelledSeat, friend, ParticipationStatus.CANCELLED);
    await anEvent(host, 20);

    await expect(idsOf([friend], scopeOf(viewer))).resolves.toEqual([
      organized,
      going,
      coOrganized,
    ]);
  });

  it('never lists drafts, cancelled, not held, private or hidden events', async () => {
    const viewer = await aUser();
    const friend = await aUser();
    const open = await anEvent(friend, 12);
    await anEvent(friend, 13, { status: EventStatus.DRAFT });
    await anEvent(friend, 14, { status: EventStatus.CANCELLED });
    await anEvent(friend, 15, { visibility: EventVisibility.PRIVATE });
    await anEvent(friend, 16, HIDDEN);
    await anEvent(friend, 5, { status: EventStatus.NOT_HELD });
    await anEvent(friend, 6, { status: EventStatus.CANCELLED });

    await expect(idsOf([friend], scopeOf(viewer))).resolves.toEqual([open]);
    await expect(idsOf([friend], scopeOf(viewer), 'past')).resolves.toEqual([]);
  });

  it('splits upcoming (until the end) from past (newest first, attended counts, no-show not)', async () => {
    const viewer = await aUser();
    const friend = await aUser();
    const host = await aUser();
    // Day 10, 08:00–12:00: going on at `now`, so still upcoming.
    const ongoing = await anEvent(friend, 10, {
      startAt: new Date('2030-01-10T08:00:00Z'),
      endAt: new Date('2030-01-10T12:00:00Z'),
    });
    const attended = await anEvent(host, 3, { status: EventStatus.FINISHED });
    await seat(attended, friend, ParticipationStatus.ATTENDED);
    const approved = await anEvent(host, 7);
    await seat(approved, friend);
    const noShow = await anEvent(host, 8, { status: EventStatus.FINISHED });
    await seat(noShow, friend, ParticipationStatus.NO_SHOW);

    await expect(idsOf([friend], scopeOf(viewer))).resolves.toEqual([ongoing]);
    await expect(idsOf([friend], scopeOf(viewer), 'past')).resolves.toEqual([
      approved,
      attended,
    ]);
  });

  it('lists a group-only event only to members and those involved', async () => {
    const member = await aUser();
    const outsider = await aUser();
    const waiting = await aUser();
    const friend = await aUser();
    const groupId = await aGroup();
    const groupOnly = await anEvent(friend, 12, {
      visibility: EventVisibility.GROUP_ONLY,
      groupId,
    });
    await prisma.participationRequest.create({
      data: {
        eventId: groupOnly,
        userId: waiting,
        status: RequestStatus.PENDING,
      },
    });

    await expect(
      idsOf([friend], scopeOf(member, { groupIds: [groupId] })),
    ).resolves.toEqual([groupOnly]);
    await expect(idsOf([friend], scopeOf(waiting))).resolves.toEqual([
      groupOnly,
    ]);
    await expect(idsOf([friend], scopeOf(outsider))).resolves.toEqual([]);
  });

  it('leaves out events organized by someone blocked from the viewer', async () => {
    const viewer = await aUser();
    const friend = await aUser();
    const blocked = await aUser();
    const theirs = await anEvent(blocked, 12);
    await seat(theirs, friend);
    const coHosted = await anEvent(friend, 13, {
      coOrganizers: { connect: { id: blocked } },
    });
    const fine = await anEvent(friend, 14);

    await expect(
      idsOf([friend], scopeOf(viewer, { hiddenOrganizerIds: [blocked] })),
    ).resolves.toEqual([fine]);
    expect(coHosted).toBeTruthy();
  });

  it('lists each event of several friends once, with the total', async () => {
    const viewer = await aUser();
    const one = await aUser();
    const other = await aUser();
    const shared = await anEvent(one, 12);
    await seat(shared, other);
    const second = await anEvent(other, 13);

    const page = await repository.getEventsWithPeople(
      [one, other],
      { period: 'upcoming', now, viewer: scopeOf(viewer) },
      { limit: 1, offset: 0 },
    );

    expect(page.items.map((event) => event.id)).toEqual([shared]);
    expect(page.total).toBe(2);
    await expect(idsOf([], scopeOf(viewer))).resolves.toEqual([]);
    expect(second).toBeTruthy();
  });

  it('names the given people on each event once, by name, without no-shows', async () => {
    const host = await aUser('Hostitel');
    const zuzana = await aUser('Zuzana');
    const adam = await aUser('Adam');
    const cyril = await aUser('Cyril');
    const stranger = await aUser('Cizí');
    const event = await anEvent(host, 12, {
      coOrganizers: { connect: { id: zuzana } },
    });
    await seat(event, zuzana);
    await seat(event, adam);
    await seat(event, stranger);
    const past = await anEvent(host, 3, { status: EventStatus.FINISHED });
    await seat(past, cyril, ParticipationStatus.NO_SHOW);
    await seat(past, adam, ParticipationStatus.ATTENDED);
    const empty = await anEvent(host, 14);

    const people = await repository.getPeopleOnEvents(
      [event, past, empty],
      [host, zuzana, adam, cyril],
    );

    expect(people.get(event)?.map((person) => person.name)).toEqual([
      'Adam',
      'Hostitel',
      'Zuzana',
    ]);
    expect(people.get(past)?.map((person) => person.name)).toEqual([
      'Adam',
      'Hostitel',
    ]);
    expect(people.has(empty)).toBe(true);
    await expect(
      repository.getPeopleOnEvents([empty], [zuzana]),
    ).resolves.toEqual(new Map());
  });
});
