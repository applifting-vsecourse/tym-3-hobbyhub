import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Gender } from '@/shared/auth/registration/registration';

type CreateUserParams = {
  email: string;
  password: string;
  name: string;
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
    name,
    username,
    gender = 'MALE',
    birthYear = 1990,
  } = params;

  // use better auth api to sign the user up using email & password. The
  // F-03.1 fields are read by the registration hook, which the typed body
  // does not know about, hence the separate variable.
  const body = {
    email,
    password,
    name,
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      // Demo accounts must be able to join and publish (F-03.2).
      emailVerified: true,
    },
  });

  return user;
}
