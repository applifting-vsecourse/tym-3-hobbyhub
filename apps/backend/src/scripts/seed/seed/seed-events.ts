import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  EventVisibility,
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

// Example photos per activity, hotlinked from Wikimedia Commons (free licences:
// CC BY, CC BY-SA, public domain; the author is on each file's Commons page,
// named in the URL). Demo data only: a real event gets its own photo.
const ACTIVITY_PHOTOS: Record<string, string> = {
  Florbal:
    'https://commons.wikimedia.org/wiki/Special:FilePath/V%C3%A4xj%C3%B6_-_UHC_floorball_face-off.jpg?width=800',
  Volejbal:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Volleyball_match_-_warming_up_2.jpg?width=800',
  Tenis:
    'https://commons.wikimedia.org/wiki/Special:FilePath/141100_-_Wheelchair_tennis_David_Hall_serves_2_-_3b_-_2000_Sydney_match_photo.jpg?width=800',
  Fotbal:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Amateur_football_match_between_Wales_and_England_at_Porthmadog_%281496762%29.jpg?width=800',
  Basketbal:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Basketball_Game_Warmup_Isla_Mujeres_2022.jpg?width=800',
  Badminton:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Badminton_players%2C_Y.M.C.A.%28I0009675%29.jpg?width=800',
  'Stolní tenis':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Table_tennis_at_the_2018_Summer_Youth_Olympics_%E2%80%93_Mixed_Bronze_Medal_Match_Women_021.jpg?width=800',
  Běh: 'https://commons.wikimedia.org/wiki/Special:FilePath/Running_through_Millennium_Park_%2819584952503%29.jpg?width=800',
  Cyklistika:
    'https://commons.wikimedia.org/wiki/Special:FilePath/2024_UCI_Para-cycling_Road_World_Championships_Zurich_Men_C1-2_R_14.jpg?width=800',
  Plavání:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Swimming_Pool_lanes_and_starting_blocks.jpg?width=800',
  Cvičení:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Outdoor_Yoga_At_the_Park.jpg?width=800',
  Turistika:
    'https://commons.wikimedia.org/wiki/Special:FilePath/Hiking_trail_on_N%C3%A1mafjall_Mountain%2C_Iceland%2C_20240716_1130_1346.jpg?width=800',
  'Deskové hry':
    'https://commons.wikimedia.org/wiki/Special:FilePath/Huge_Settlers_of_Catan_game_in_Petah_Tikva_05.jpg?width=800',
  Šachy:
    'https://commons.wikimedia.org/wiki/Special:FilePath/The_Chess_Players_%28Dec_2022%29.jpg?width=800',
  'LAN party':
    'https://commons.wikimedia.org/wiki/Special:FilePath/LAN_party_in_France_in_2003.jpg?width=800',
};

type Seat = { user: User; status: ParticipationStatus };

type Place = {
  street: string;
  city: string;
  postalCode: string;
  district: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

type Example = {
  title: string;
  description: string;
  equipment?: string;
  activity: string;
  level: string;
  startAt: Date;
  min: number;
  max: number;
  external?: number;
  contribution?: number;
  venueType?: VenueType;
  place?: Place;
  onlineUrl?: string;
  // Everything below defaults to a public, published event. The odd ones out
  // exist to check that the listing leaves them out.
  status?: EventStatus;
  visibility?: EventVisibility;
  isHidden?: boolean;
  seats?: Seat[];
};

/**
 * Example events with rosters, so the landing page and listings have something
 * to show. Additive: an example is created only when no event with its title
 * exists yet, so a database that already has events picks up newly added ones
 * without duplicating the rest. Needs at least one user (the organizer); the
 * other users fill the rosters.
 */
export async function seedEvents(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  const [organizer, ...others] = users;
  if (!organizer) {
    console.log('No users — skipping example events.');
    return;
  }

  const now = Date.now();
  // A time that is still ahead: "today 20:00" run at 21:00 moves to tomorrow.
  const at = (days: number, hour: number, minute = 0): Date => {
    const date = new Date(now + days * DAY_IN_MS);
    date.setHours(hour, minute, 0, 0);
    return date.getTime() > now + HOUR_IN_MS
      ? date
      : new Date(date.getTime() + DAY_IN_MS);
  };
  const approved = (count: number): Seat[] =>
    others
      .slice(0, count)
      .map((user) => ({ user, status: ParticipationStatus.APPROVED }));

  const prague8 = {
    city: 'Praha',
    district: 'Praha 8',
  };

  const examples: Example[] = [
    {
      title: 'Čtvrteční florbal',
      description:
        'Přátelský zápas v tělocvičně, hrajeme na dvě třetiny hřiště. Chybí nám pár lidí do minima.',
      equipment: 'Hokejka a sálová obuv, dresy máme.',
      activity: 'Florbal',
      level: 'Pokročilí',
      startAt: at(1, 19),
      min: 8,
      max: 10,
      external: 2,
      contribution: 80,
      place: {
        ...prague8,
        street: 'Chabařovická 1',
        postalCode: '18200',
        placeName: 'ZŠ Kobylisy',
        latitude: 50.1297,
        longitude: 14.4421,
      },
      seats: approved(4),
    },
    {
      title: 'Deskovky v herně',
      description:
        'Večer deskových her, od lehkých po ty na tři hodiny. Hry máme.',
      activity: 'Deskové hry',
      level: 'Všechny úrovně',
      startAt: at(0, 20),
      min: 5,
      max: 8,
      external: 1,
      place: {
        ...prague8,
        street: 'Sokolovská 100',
        postalCode: '18600',
        placeName: 'Herna Kostka',
        latitude: 50.0952,
        longitude: 14.4486,
      },
      seats: approved(2),
    },
    {
      title: 'Volejbal na hřišti',
      description: 'Smíšený volejbal pod širým nebem, začátečníci vítáni.',
      activity: 'Volejbal',
      level: 'Začátečníci',
      startAt: at(2, 10),
      min: 6,
      max: 12,
      place: {
        city: 'Praha',
        district: 'Praha 7',
        street: 'Letohradská 1',
        postalCode: '17000',
        placeName: 'Hřiště Letná',
        latitude: 50.0961,
        longitude: 14.4258,
      },
      seats: [
        ...approved(3),
        ...others
          .slice(3, 4)
          .map((user) => ({ user, status: ParticipationStatus.WAITLISTED })),
      ],
    },
    {
      title: 'Šachy online',
      description:
        'Rychlé partie přes video hovor, odkaz uvidí schválení hráči.',
      activity: 'Šachy',
      level: 'Mírně pokročilí',
      startAt: at(3, 18),
      min: 2,
      max: 2,
      venueType: VenueType.ONLINE,
      onlineUrl: 'https://meet.example.com/sachy-pocitace',
    },
    {
      title: 'Páteční badminton',
      description: 'Dva kurty na hodinu a půl, hrajeme čtyřhru ve střídání.',
      equipment: 'Rakety půjčíme, stačí sálová obuv.',
      activity: 'Badminton',
      level: 'Mírně pokročilí',
      startAt: at(2, 17, 30),
      min: 2,
      max: 4,
      external: 2,
      contribution: 120,
      place: {
        city: 'Praha',
        district: 'Praha 6',
        street: 'Bělohorská 80',
        postalCode: '16900',
        placeName: 'Sportcentrum Břevnov',
        latitude: 50.0869,
        longitude: 14.3685,
      },
      seats: approved(1),
    },
    {
      title: 'Ranní běh podél Vltavy',
      description:
        'Klidné tempo kolem šesti minut na kilometr, osm kilometrů, pak snídaně.',
      activity: 'Běh',
      level: 'Všechny úrovně',
      startAt: at(1, 6, 30),
      min: 3,
      max: 15,
      place: {
        city: 'Praha',
        district: 'Praha 2',
        street: 'Rašínovo nábřeží',
        postalCode: '12800',
        placeName: 'U Výtoně',
        latitude: 50.0647,
        longitude: 14.4178,
      },
      seats: approved(1),
    },
    {
      title: 'Basketbal 3 na 3',
      description: 'Turnajový mix po třech, zápasy na jeden koš do jedenácti.',
      activity: 'Basketbal',
      level: 'Pokročilí',
      startAt: at(3, 17),
      min: 6,
      max: 8,
      external: 3,
      place: {
        city: 'Praha',
        district: 'Praha 5',
        street: 'Kartouzská 4',
        postalCode: '15000',
        placeName: 'Hřiště na Smíchově',
        latitude: 50.0711,
        longitude: 14.4036,
      },
      seats: approved(2),
    },
    {
      title: 'Výšlap na Padrť',
      description:
        'Dvanáct kilometrů Brdy, výhled z kopce a pivo v hospodě. Sraz u autobusu.',
      equipment: 'Pevné boty a vodu.',
      activity: 'Turistika',
      level: 'Mírně pokročilí',
      startAt: at(5, 8),
      min: 4,
      max: 12,
      place: {
        city: 'Příbram',
        district: 'Příbram',
        street: 'Padrť',
        postalCode: '26101',
        placeName: 'Parkoviště Padrť',
        latitude: 49.6467,
        longitude: 13.8683,
      },
      seats: approved(1),
    },
    {
      title: 'Stolní tenis u Nováků',
      description:
        'Dva stoly v garáži, hrajeme každý s každým. Adresu pošleme.',
      activity: 'Stolní tenis',
      level: 'Začátečníci',
      startAt: at(4, 17),
      min: 2,
      max: 4,
      venueType: VenueType.PRIVATE_VENUE,
      place: {
        city: 'Brno',
        district: 'Brno-Žabovřesky',
        street: 'Veslařská 12',
        postalCode: '63700',
        placeName: 'Garáž u Nováků',
        latitude: 49.2145,
        longitude: 16.5818,
      },
      seats: approved(1),
    },
    {
      title: 'LAN party na dálku',
      description: 'Starší střílečky a závody, hrajeme přes Discord.',
      activity: 'LAN party',
      level: 'Všechny úrovně',
      startAt: at(6, 19),
      min: 4,
      max: 16,
      venueType: VenueType.ONLINE,
      onlineUrl: 'https://discord.example.com/lan',
      seats: approved(3),
    },
    {
      title: 'Plavání před prací',
      description: 'Hodina na dráze, každý plave svoje, pak společná sauna.',
      activity: 'Plavání',
      level: 'Pokročilí',
      startAt: at(2, 6, 45),
      min: 2,
      max: 10,
      place: {
        city: 'Praha',
        district: 'Praha 4',
        street: 'Sdružení 1',
        postalCode: '14000',
        placeName: 'Plavecký stadion Podolí',
        latitude: 50.0481,
        longitude: 14.4167,
      },
    },
    {
      title: 'Cvičení v parku',
      description: 'Funkční trénink s vlastní vahou, hodina pod stromy.',
      activity: 'Cvičení',
      level: 'Začátečníci',
      startAt: at(3, 18),
      min: 3,
      max: 15,
      place: {
        city: 'Praha',
        district: 'Praha 2',
        street: 'Riegrovy sady',
        postalCode: '12000',
        placeName: 'Riegrovy sady',
        latitude: 50.0795,
        longitude: 14.4435,
      },
    },
    {
      title: 'Šachy v kavárně',
      description: 'Partie za šachovnicí u kávy, hodiny s sebou.',
      activity: 'Šachy',
      level: 'Pokročilí',
      startAt: at(1, 16),
      min: 2,
      max: 2,
      place: {
        city: 'Brno',
        district: 'Brno-střed',
        street: 'Kobližná 4',
        postalCode: '60200',
        placeName: 'Kavárna Šach',
        latitude: 49.1962,
        longitude: 16.6108,
      },
      seats: approved(1),
    },
    {
      title: 'Malá kopaná na umělce',
      description: 'Sedm na sedm na umělé trávě, dresy máme.',
      activity: 'Fotbal',
      level: 'Mírně pokročilí',
      startAt: at(7, 19),
      min: 10,
      max: 14,
      external: 5,
      contribution: 100,
      place: {
        city: 'Praha',
        district: 'Praha 10',
        street: 'Přístavní 3',
        postalCode: '10000',
        placeName: 'Umělka Vršovice',
        latitude: 50.0645,
        longitude: 14.4571,
      },
      seats: approved(4),
    },
    // Not in the listing: each differs from a listed event in exactly one way.
    {
      title: 'Interní trénink skupiny',
      description: 'Jen pro členy skupiny, na veřejném seznamu být nemá.',
      activity: 'Florbal',
      level: 'Pokročilí',
      startAt: at(2, 20),
      min: 6,
      max: 10,
      visibility: EventVisibility.GROUP_ONLY,
      place: {
        ...prague8,
        street: 'Chabařovická 1',
        postalCode: '18200',
        placeName: 'ZŠ Kobylisy',
        latitude: 50.1297,
        longitude: 14.4421,
      },
    },
    {
      title: 'Koncept: cyklovýlet',
      description: 'Rozpracovaná akce, ještě není zveřejněná.',
      activity: 'Cyklistika',
      level: 'Všechny úrovně',
      startAt: at(8, 9),
      min: 3,
      max: 10,
      status: EventStatus.DRAFT,
      place: {
        city: 'Praha',
        district: 'Praha 6',
        street: 'Evropská 1',
        postalCode: '16000',
        placeName: 'Vypich',
        latitude: 50.0875,
        longitude: 14.3552,
      },
    },
    {
      title: 'Zrušený tenisový turnaj',
      description: 'Zrušeno pro nepříznivé počasí.',
      activity: 'Tenis',
      level: 'Pokročilí',
      startAt: at(3, 10),
      min: 2,
      max: 4,
      status: EventStatus.CANCELLED,
      place: {
        city: 'Praha',
        district: 'Praha 7',
        street: 'Ovenecká 1',
        postalCode: '17000',
        placeName: 'Tenisové kurty Letná',
        latitude: 50.0985,
        longitude: 14.4262,
      },
    },
    {
      title: 'Skrytá moderátorem',
      description: 'Akce, kterou moderátor skryl, v seznamu být nemá.',
      activity: 'Ostatní',
      level: 'Všechny úrovně',
      startAt: at(2, 15),
      min: 2,
      max: 6,
      isHidden: true,
      place: {
        ...prague8,
        street: 'Zenklova 1',
        postalCode: '18000',
        placeName: 'Kavárna u parku',
        latitude: 50.1085,
        longitude: 14.4429,
      },
    },
    {
      title: 'Včerejší florbal',
      description: 'Už proběhlo, v seznamu být nemá.',
      activity: 'Florbal',
      level: 'Pokročilí',
      startAt: new Date(now - DAY_IN_MS),
      min: 8,
      max: 10,
      status: EventStatus.FINISHED,
      place: {
        ...prague8,
        street: 'Chabařovická 1',
        postalCode: '18200',
        placeName: 'ZŠ Kobylisy',
        latitude: 50.1297,
        longitude: 14.4421,
      },
      seats: approved(3),
    },
  ];

  // Enough further events that the list needs more than one page.
  const fillerActivities = [
    ['Běh', 'Večerní běh'],
    ['Volejbal', 'Plážový volejbal'],
    ['Tenis', 'Tenis na kurtech'],
    ['Cyklistika', 'Výlet na kolech'],
    ['Deskové hry', 'Deskovky v kavárně'],
    ['Fotbal', 'Fotbálek po práci'],
  ] as const;
  const fillerPlaces: Place[] = [
    {
      city: 'Praha',
      district: 'Praha 3',
      street: 'Koněvova 1',
      postalCode: '13000',
      placeName: 'Hřiště Žižkov',
      latitude: 50.0839,
      longitude: 14.4547,
    },
    {
      city: 'Praha',
      district: 'Praha 4',
      street: 'Budějovická 1',
      postalCode: '14000',
      placeName: 'Sportovní hala Krč',
      latitude: 50.0442,
      longitude: 14.4492,
    },
    {
      city: 'Brno',
      district: 'Brno-střed',
      street: 'Údolní 1',
      postalCode: '60200',
      placeName: 'Sportcentrum Údolní',
      latitude: 49.2021,
      longitude: 16.5987,
    },
  ];
  for (let index = 0; index < 12; index++) {
    const [activity, title] = fillerActivities[index % fillerActivities.length];
    examples.push({
      title: `${title} ${index + 1}`,
      description: 'Ukázková akce, aby měl seznam z čeho stránkovat.',
      activity,
      level: 'Všechny úrovně',
      startAt: at(8 + index, 17 + (index % 3)),
      min: 4,
      max: 8,
      place: fillerPlaces[index % fillerPlaces.length],
      seats: approved(index % 4),
    });
  }

  const levels = new Map(
    (await prisma.level.findMany()).map((level) => [level.name, level.id]),
  );
  const activities = new Map(
    (await prisma.activity.findMany()).map((activity) => [
      activity.name,
      activity.id,
    ]),
  );
  const idOf = (map: Map<string, string>, name: string): string => {
    const id = map.get(name);
    if (!id) throw new Error(`Seed lookup is missing: ${name}`);
    return id;
  };

  let created = 0;

  for (const example of examples) {
    const photo = ACTIVITY_PHOTOS[example.activity] ?? null;
    const existing = await prisma.event.findFirst({
      where: { title: example.title },
    });
    if (existing) {
      // Events seeded before photos existed get theirs; a photo set on purpose stays.
      if (!existing.imageUrl && photo) {
        await prisma.event.update({
          where: { id: existing.id },
          data: { imageUrl: photo },
        });
      }
      continue;
    }

    const { place } = example;
    const status = example.status ?? EventStatus.PUBLISHED;
    const venueType = example.venueType ?? VenueType.PUBLIC_VENUE;

    const event = await prisma.event.create({
      data: {
        title: example.title,
        description: example.description,
        imageUrl: photo,
        equipment: example.equipment,
        status,
        visibility: example.visibility ?? EventVisibility.PUBLIC,
        isHidden: example.isHidden ?? false,
        approvalMode: ApprovalMode.MANUAL,
        venueType,
        onlineUrl: example.onlineUrl,
        startAt: example.startAt,
        endAt: new Date(example.startAt.getTime() + 2 * HOUR_IN_MS),
        publishedAt: status === EventStatus.DRAFT ? undefined : new Date(now),
        cancelledAt:
          status === EventStatus.CANCELLED ? new Date(now) : undefined,
        minParticipants: example.min,
        maxParticipants: example.max,
        externalOccupiedSpots: example.external ?? 0,
        fillDeadlineHours: 3,
        freeCancellationHours: 12,
        contributionAmount: example.contribution,
        ...(place && venueType !== VenueType.ONLINE
          ? {
              locationStreet: place.street,
              locationCity: place.city,
              locationPostalCode: place.postalCode,
              locationCountry: 'Česko',
              locationDistrict: place.district,
              locationPlaceName: place.placeName,
              locationLatitude: place.latitude,
              locationLongitude: place.longitude,
            }
          : {}),
        activityId: idOf(activities, example.activity),
        levelId: idOf(levels, example.level),
        organizerId: organizer.id,
      },
    });

    // The organizer joins their own event straight away (Event.joinAsOrganizer).
    await prisma.participation.create({
      data: {
        eventId: event.id,
        userId: organizer.id,
        status: ParticipationStatus.APPROVED,
        confirmedAt: new Date(now),
      },
    });

    let waitlistPosition = 1;
    for (const { user, status: seatStatus } of example.seats ?? []) {
      await prisma.participation.create({
        data: {
          eventId: event.id,
          userId: user.id,
          status: seatStatus,
          confirmedAt: seatStatus === 'APPROVED' ? new Date(now) : undefined,
          waitlistPosition:
            seatStatus === 'WAITLISTED' ? waitlistPosition++ : undefined,
        },
      });
    }
    created++;
  }

  console.log(
    created > 0
      ? `Created ${created} example event(s)`
      : 'Example events already exist — nothing to add.',
  );

  await seedExampleGroup(
    prisma,
    organizer,
    others,
    idOf(activities, 'Florbal'),
  );
}

// F-02.5: one public group that organizes "Čtvrteční florbal", so the event
// links to a group page. Additive like the events: nothing is added twice.
async function seedExampleGroup(
  prisma: PrismaService,
  owner: User,
  members: User[],
  activityId: string,
): Promise<void> {
  const name = 'Čtvrteční florbalisté';
  const group =
    (await prisma.group.findFirst({ where: { name } })) ??
    (await prisma.group.create({
      data: {
        name,
        description: 'Rekreační florbal každý čtvrtek. Nováčci vítáni.',
        locationName: 'Praha 8',
        usualSchedule: 'Čtvrtky 19:00',
        activityId,
        memberships: {
          create: [
            { userId: owner.id, role: 'OWNER' },
            ...members.slice(0, 5).map((user) => ({ userId: user.id })),
          ],
        },
      },
    }));

  await prisma.event.updateMany({
    where: { title: 'Čtvrteční florbal', groupId: null },
    data: { groupId: group.id },
  });
}
