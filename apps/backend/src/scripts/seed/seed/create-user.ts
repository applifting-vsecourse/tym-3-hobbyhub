import { PrismaService } from '@/core/prisma/prisma.service';
import { User, UserRole } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Gender } from '@/shared/auth/registration/registration';

type CreateUserParams = {
  email: string;
  password: string;
  name: string;
  username: string;
  role?: string;
  // F-03.1 registration fields; seeded people do not need distinct values.
  gender?: Gender;
  birthDate?: Date;
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
    role,
    gender = 'MALE',
    birthDate = new Date('1990-01-01T00:00:00Z'),
  } = params;

  // use better auth api to sign the user up using email & password. The
  // F-03.1 fields are read by the registration hook, which the typed body
  // does not know about, hence the separate variable.
  const body = {
    email,
    password,
    name,
    gender,
    birthDate,
    termsAccepted: true,
  };
  await auth.api.signUpEmail({ body });

  // find the user in the database
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error(`Failed to create user with email: ${email}`);
  }

  // assign a role to the user directly
  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      role: role as UserRole,
    },
  });

  return user;
}
