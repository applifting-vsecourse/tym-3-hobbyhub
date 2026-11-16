import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { normalizeNickname } from '@/shared/auth/registration/nickname';
import { Gender } from '@/shared/auth/registration/registration';

type CreateUserParams = {
  email: string;
  password: string;
  // The nickname as shown (#212); `name` is always the same.
  username: string;
  // F-03.1 registration fields; seeded people do not need distinct values.
  gender?: Gender;
  birthYear?: number;
};

export async function createUser(
  prisma: PrismaService,
  auth: BetterAuth,
  params: CreateUserParams,
): Promise<User> {
  const {
    email,
    password,
    username,
    gender = 'MALE',
    birthYear = 1990,
  } = params;

  // use better auth api to sign the user up using email & password. The
  // F-03.1 fields are read by the registration hook, which the typed body
  // does not know about, hence the separate variable. The sign-up refuses
  // reserved nicknames ("superadmin", "PondAdmin"), so it gets a placeholder
  // and the real nickname is set below, directly (ADR-0025).
  const placeholder = `seed_${randomUUID().split('-').join('').slice(0, 20)}`;
  const body = {
    email,
    password,
    name: placeholder,
    username: placeholder,
    gender,
    birthYear,
    termsAccepted: true,
    adulthoodConfirmed: true,
  };
  await auth.api.signUpEmail({ body });

  // find the user in the database
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error(`Failed to create user with email: ${email}`);
  }

  // assign the nickname to the user directly
  return prisma.user.update({
    where: { id: user.id },
    data: {
      name: username,
      displayUsername: username,
      username: normalizeNickname(username),
      // Demo accounts must be able to join and publish (F-03.2).
      emailVerified: true,
    },
  });
}
