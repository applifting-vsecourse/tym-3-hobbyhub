export class Identity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    // F-03.2: unverified people can browse and ask to join, but not publish an
    // event or found a group.
    public readonly emailVerified: boolean,
  ) {}
}
