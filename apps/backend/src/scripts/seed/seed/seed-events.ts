import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Activity,
  ApprovalMode,
  EventStatus,
  EventVisibility,
  Level,
  ParticipationStatus,
  User,
  VenueType,
} from '@/generated/prisma/client';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

// `icon` is the key of the icon in the frontend (ACTIVITIES in ActivityIcon.tsx).
const ACTIVITY_CATEGORIES = [
  {
    name: 'Sport',
    activities: [
      { name: 'Florbal', icon: 'florbal', min: 8, max: 12 },
      { name: 'Volejbal', icon: 'volejbal', min: 6, max: 12 },
      { name: 'Tenis', icon: 'tenis', min: 2, max: 4 },
      { name: 'Fotbal', icon: 'fotbal', min: 10, max: 22 },
      { name: 'Basketbal', icon: 'basketbal', min: 6, max: 10 },
      { name: 'Badminton', icon: 'badminton', min: 2, max: 4 },
      { name: 'Stolní tenis', icon: 'stolni-tenis', min: 2, max: 4 },
      { name: 'Běh', icon: 'beh', min: 2, max: 20 },
      { name: 'Cyklistika', icon: 'cyklistika', min: 2, max: 15 },
      { name: 'Plavání', icon: 'plavani', min: 2, max: 10 },
      { name: 'Cvičení', icon: 'cviceni', min: 3, max: 15 },
      { name: 'Turistika', icon: 'turistika', min: 2, max: 15 },
    ],
  },
  {
    name: 'Hry',
    activities: [
      { name: 'Deskové hry', icon: 'deskove-hry', min: 3, max: 8 },
      { name: 'Šachy', icon: 'sachy', min: 2, max: 2 },
      { name: 'LAN party', icon: 'lan-party', min: 4, max: 16 },
    ],
  },
  {
    name: 'Ostatní',
    activities: [{ name: 'Ostatní', icon: 'ostatni', min: 2, max: 20 }],
  },
];

const LEVELS = [
  'Začátečníci',
  'Mírně pokročilí',
  'Pokročilí',
  'Všechny úrovně',
];

const CANCELLATION_REASONS = [
  'Málo přihlášených',
  'Nepříznivé počasí',
  'Nedostupné místo',
  'Nemoc organizátora',
  'Jiný důvod',
];

/**
 * Lookup tables: safe to run repeatedly (upsert by unique name), so an
 * existing database picks them up without being wiped.
 */
export async function seedLookups(prisma: PrismaService): Promise<void> {
  for (const category of ACTIVITY_CATEGORIES) {
    const { id: categoryId } = await prisma.activityCategory.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name },
    });

    for (const { name, icon, min, max } of category.activities) {
      await prisma.activity.upsert({
        where: { name },
        update: {},
        create: {
          name,
          icon,
          categoryId,
          defaultMinParticipants: min,
          defaultMaxParticipants: max,
        },
      });
    }
  }

  for (const [index, name] of LEVELS.entries()) {
    await prisma.level.upsert({
      where: { name },
      update: {},
      create: { name, order: index + 1 },
    });
  }

  for (const name of CANCELLATION_REASONS) {
    await prisma.cancellationReason.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

type Seat = { user: User; status: ParticipationStatus };

/**
 * Example events with rosters, so the landing page and listings have something
 * to show. Only runs on a database without events: it never duplicates them.
 * Needs at least one user (the organizer); the other users fill the rosters.
 */
export async function seedEvents(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  if ((await prisma.event.count()) > 0) {
    console.log('Events already exist — skipping example events.');
    return;
  }

  const [organizer, ...others] = users;
  if (!organizer) {
    console.log('No users — skipping example events.');
    return;
  }

  const activity = async (name: string): Promise<Activity> =>
    prisma.activity.findUniqueOrThrow({ where: { name } });
  const level = async (name: string): Promise<Level> =>
    prisma.level.findUniqueOrThrow({ where: { name } });

  const now = Date.now();
  const at = (days: number, hour: number): Date => {
    const date = new Date(now + days * DAY_IN_MS);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const examples = [
    {
      title: 'Čtvrteční florbal',
      description:
        'Přátelský zápas v tělocvičně, hrajeme na dvě třetiny hřiště. Chybí nám pár lidí do minima.',
      equipment: 'Hokejka a sálová obuv, dresy máme.',
      activity: await activity('Florbal'),
      level: await level('Pokročilí'),
      startAt: at(1, 19),
      min: 8,
      max: 10,
      external: 2,
      contribution: 80,
      venueType: VenueType.PUBLIC_VENUE,
      location: {
        locationStreet: 'Chabařovická 1',
        locationCity: 'Praha',
        locationPostalCode: '18200',
        locationCountry: 'Česko',
        locationDistrict: 'Praha 8',
        locationPlaceName: 'ZŠ Kobylisy',
        locationLatitude: 50.1297,
        locationLongitude: 14.4421,
      },
      seats: others.slice(0, 4).map((user) => ({
        user,
        status: ParticipationStatus.APPROVED,
      })),
    },
    {
      title: 'Deskovky v herně',
      description:
        'Večer deskových her, od lehkých po ty na tři hodiny. Hry máme.',
      activity: await activity('Deskové hry'),
      level: await level('Všechny úrovně'),
      startAt: at(0, 20),
      min: 5,
      max: 8,
      external: 1,
      contribution: null,
      venueType: VenueType.PUBLIC_VENUE,
      location: {
        locationStreet: 'Sokolovská 100',
        locationCity: 'Praha',
        locationPostalCode: '18600',
        locationCountry: 'Česko',
        locationDistrict: 'Praha 8',
        locationPlaceName: 'Herna Kostka',
        locationLatitude: 50.0952,
        locationLongitude: 14.4486,
      },
      seats: others.slice(0, 2).map((user) => ({
        user,
        status: ParticipationStatus.APPROVED,
      })),
    },
    {
      title: 'Volejbal na hřišti',
      description: 'Smíšený volejbal pod širým nebem, začátečníci vítáni.',
      activity: await activity('Volejbal'),
      level: await level('Začátečníci'),
      startAt: at(2, 10),
      min: 6,
      max: 12,
      external: 0,
      contribution: null,
      venueType: VenueType.PUBLIC_VENUE,
      location: {
        locationStreet: 'Letohradská 1',
        locationCity: 'Praha',
        locationPostalCode: '17000',
        locationCountry: 'Česko',
        locationDistrict: 'Praha 7',
        locationPlaceName: 'Hřiště Letná',
        locationLatitude: 50.0961,
        locationLongitude: 14.4258,
      },
      seats: [
        ...others.slice(0, 3).map((user) => ({
          user,
          status: ParticipationStatus.APPROVED,
        })),
        ...others.slice(3, 4).map((user) => ({
          user,
          status: ParticipationStatus.WAITLISTED,
        })),
      ],
    },
    {
      title: 'Šachy online',
      description:
        'Rychlé partie přes video hovor, odkaz uvidí schválení hráči.',
      activity: await activity('Šachy'),
      level: await level('Mírně pokročilí'),
      startAt: at(3, 18),
      min: 2,
      max: 2,
      external: 0,
      contribution: null,
      venueType: VenueType.ONLINE,
      onlineUrl: 'https://meet.example.com/sachy-pocitace',
      location: {},
      seats: [] as Seat[],
    },
  ];

  console.log('Creating example events');

  for (const example of examples) {
    const { seats, location, ...event } = example;

    const created = await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        equipment: 'equipment' in event ? event.equipment : undefined,
        status: EventStatus.PUBLISHED,
        visibility: EventVisibility.PUBLIC,
        approvalMode: ApprovalMode.MANUAL,
        venueType: event.venueType,
        onlineUrl: 'onlineUrl' in event ? event.onlineUrl : undefined,
        startAt: event.startAt,
        endAt: new Date(event.startAt.getTime() + 2 * HOUR_IN_MS),
        publishedAt: new Date(now),
        minParticipants: event.min,
        maxParticipants: event.max,
        externalOccupiedSpots: event.external,
        fillDeadlineHours: 3,
        freeCancellationHours: 12,
        contributionAmount: event.contribution ?? undefined,
        ...location,
        activityId: event.activity.id,
        levelId: event.level.id,
        organizerId: organizer.id,
      },
    });

    // The organizer joins their own event straight away (Event.joinAsOrganizer).
    await prisma.participation.create({
      data: {
        eventId: created.id,
        userId: organizer.id,
        status: ParticipationStatus.APPROVED,
        confirmedAt: new Date(now),
      },
    });

    let waitlistPosition = 1;
    for (const { user, status } of seats) {
      await prisma.participation.create({
        data: {
          eventId: created.id,
          userId: user.id,
          status,
          confirmedAt: status === 'APPROVED' ? new Date(now) : undefined,
          waitlistPosition:
            status === 'WAITLISTED' ? waitlistPosition++ : undefined,
        },
      });
    }
  }
}
