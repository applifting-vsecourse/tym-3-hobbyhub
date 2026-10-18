import { PrismaService } from '@/core/prisma/prisma.service';
import { GroupRole, GroupStatus, User } from '@/generated/prisma/client';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Seeded user who gets a home in Praha, so "Skupiny ve vašem okolí" has hits.
const NEARBY_USER_EMAIL = 'caffeinatedduck@example.com';

type ExampleGroup = {
  name: string;
  activity: string;
  description: string;
  locationName: string | null;
  usualSchedule: string | null;
  status?: GroupStatus;
  daysAgo: number;
  // Indexes into the users passed to seedGroups; the first one is the owner.
  owner: number;
  admins?: number[];
  members?: number[];
};

// The first user owns one group and is a member of two (the wireframe's
// "Moje skupiny"); the rest belong to others, so "Objevit" has something too.
const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    name: 'Čtvrteční florbalisté',
    activity: 'Florbal',
    description:
      'Hrajeme každý čtvrtek v hale ZŠ Kobylisy. Nováčci vítáni, hokejku půjčíme.',
    locationName: 'Praha 8',
    usualSchedule: 'čtvrtky 19:00',
    daysAgo: 60,
    owner: 0,
    admins: [1],
    members: [2, 3],
  },
  {
    name: 'Deskovky Holešovice',
    activity: 'Deskové hry',
    description:
      'Scházíme se v kavárně u Vltavské, hry nosí každý, kdo chce. Od party her po euro.',
    locationName: 'Praha 7',
    usualSchedule: 'pátky 18:30',
    daysAgo: 45,
    owner: 1,
    members: [0, 4],
  },
  {
    name: 'Volejbal na hřišti',
    activity: 'Volejbal',
    description:
      'Beach volejbal na Štvanici, dokud to počasí dovolí. Hrajeme pro radost.',
    locationName: 'Praha 7',
    usualSchedule: 'soboty 10:00',
    daysAgo: 30,
    owner: 2,
    members: [0, 1, 3, 4],
  },
  {
    name: 'Tenis pro začátečníky',
    activity: 'Tenis',
    description:
      'Učíme se spolu podávat a nepanikařit u sítě. Kurty v Tróji, rakety máme navíc.',
    locationName: 'Praha 8',
    usualSchedule: 'středy 18:00',
    daysAgo: 20,
    owner: 3,
    members: [4],
  },
  {
    name: 'Deskovky na Žižkově',
    activity: 'Deskové hry',
    description: 'Dlouhé strategie v hospodě pod Parukářkou. Pivo dobrovolné.',
    locationName: 'Praha 3',
    usualSchedule: 'čtvrtky 19:00',
    daysAgo: 12,
    owner: 4,
    members: [2],
  },
  {
    name: 'Běhání na Letné',
    activity: 'Běh',
    description:
      'Pohodové kolečko po Letenské pláni, tempo podle nejpomalejšího.',
    locationName: 'Praha 7',
    usualSchedule: 'neděle 9:00',
    daysAgo: 8,
    owner: 3,
    members: [1, 2],
  },
  {
    name: 'Šachy v Lužánkách',
    activity: 'Šachy',
    description: 'Bleskovky i dlouhé partie na lavičkách v parku.',
    locationName: 'Brno',
    usualSchedule: 'úterky 17:00',
    daysAgo: 5,
    owner: 4,
  },
  {
    name: 'Cyklovýlety bez cíle',
    activity: 'Cyklistika',
    description: 'Vyrážíme, kam nás vítr zanese. Místo domluvíme vždy předem.',
    locationName: null,
    usualSchedule: null,
    daysAgo: 3,
    owner: 2,
    members: [3],
  },
  {
    // Cancelled groups stay out of every list (F-07.8).
    name: 'Zimní plavání v Podolí',
    activity: 'Plavání',
    description: 'Otužování skončilo s jarem.',
    locationName: 'Praha 4',
    usualSchedule: 'soboty 8:00',
    status: GroupStatus.CANCELLED,
    daysAgo: 90,
    owner: 1,
    members: [0],
  },
];

/**
 * Example groups with members, so the group list has something to show. Only
 * runs on a database without groups: it never duplicates them. Expects the
 * activities from seedLookups.
 */
export async function seedGroups(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  if ((await prisma.group.count()) > 0) {
    console.log('Groups already exist — skipping example groups.');
    return;
  }
  if (users.length === 0) {
    console.log('No users — skipping example groups.');
    return;
  }

  const now = Date.now();
  // Fewer users than the examples expect: wrap around, duplicates dropped below.
  const user = (index: number): User => users[index % users.length];

  for (const example of EXAMPLE_GROUPS) {
    const owner = user(example.owner);
    const roles = new Map<string, GroupRole>([[owner.id, GroupRole.OWNER]]);
    for (const index of example.admins ?? []) {
      if (!roles.has(user(index).id))
        roles.set(user(index).id, GroupRole.ADMIN);
    }
    for (const index of example.members ?? []) {
      if (!roles.has(user(index).id)) {
        roles.set(user(index).id, GroupRole.MEMBER);
      }
    }
    const createdAt = new Date(now - example.daysAgo * DAY_IN_MS);

    await prisma.group.create({
      data: {
        name: example.name,
        description: example.description,
        locationName: example.locationName,
        usualSchedule: example.usualSchedule,
        status: example.status ?? GroupStatus.ACTIVE,
        createdAt,
        activity: { connect: { name: example.activity } },
        memberships: {
          create: [...roles].map(([userId, role]) => ({
            userId,
            role,
            joinedAt: createdAt,
          })),
        },
      },
    });
  }

  // Never overwrite a home someone already set.
  await prisma.user.updateMany({
    where: { email: NEARBY_USER_EMAIL, homeCity: null },
    data: {
      homeStreet: 'Chabařovická 1',
      homeCity: 'Praha',
      homePostalCode: '18200',
      homeCountry: 'Česko',
      homeDistrict: 'Praha 8',
      homeLatitude: 50.1297,
      homeLongitude: 14.4421,
    },
  });
}
