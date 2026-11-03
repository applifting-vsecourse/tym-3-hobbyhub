export class Identity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly role: string,
    // F-03.2: unverified people can browse, but not ask to join or publish.
    public readonly emailVerified: boolean,
  ) {}
}
