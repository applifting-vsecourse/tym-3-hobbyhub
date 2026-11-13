import {
  AdministratorListItem,
  DeactivationViolation,
  deactivationViolations,
  InvitationViolation,
  invitationViolations,
  normalizeAdministratorEmail,
  ReactivationViolation,
  reactivationViolations,
  ResendViolation,
  resendViolations,
} from '@/modules/administrator/domain/administrator';
import { AdministratorRepository } from '@/modules/administrator/repositories/administrator.repository';
import { AdminInvitations } from '@/shared/admin-auth/admin-invitations';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type Violation =
  | InvitationViolation
  | ResendViolation
  | DeactivationViolation
  | ReactivationViolation;

const VIOLATION_MESSAGES: Record<Violation, string> = {
  ALREADY_ADMINISTRATOR: 'This address already belongs to an administrator',
  DEACTIVATED_ADMINISTRATOR:
    'This administrator was deactivated; give their access back instead',
  NOT_INVITED: 'Only an invited administrator gets the invitation again',
  SELF: 'An administrator cannot deactivate themselves',
  ALREADY_DEACTIVATED: 'The administrator is deactivated already',
  LAST_ACTIVE: 'The last active administrator cannot be deactivated',
  NOT_DEACTIVATED: 'Only a deactivated administrator gets access back',
};

// The same shape as the other modules' refusals: messages and their codes.
const violationsBody = (
  violations: Violation[],
): { message: string[]; violations: Violation[] } => ({
  message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
  violations,
});

const refused = (violations: Violation[]): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    ...violationsBody(violations),
  });

// #237, ADR-0021: administrators invite, deactivate and reactivate each other.
@Injectable()
export class AdministratorsService {
  constructor(
    private readonly repository: AdministratorRepository,
    private readonly invitations: AdminInvitations,
  ) {}

  listAdministrators(): Promise<AdministratorListItem[]> {
    return this.repository.listAdministrators();
  }

  async invite(
    actor: AdminIdentity,
    input: { email: string; name: string },
    now = new Date(),
  ): Promise<AdministratorListItem> {
    const email = normalizeAdministratorEmail(input.email);
    const violations = invitationViolations(
      await this.repository.findByEmail(email),
    );
    if (violations.length > 0) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        ...violationsBody(violations),
      });
    }
    const administrator = await this.repository.createInvited({
      email,
      name: input.name.trim(),
      createdById: actor.id,
      now,
    });
    // Invited by a colleague at the same moment.
    if (!administrator) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        ...violationsBody(['ALREADY_ADMINISTRATOR']),
      });
    }
    await this.invitations.send(administrator);
    return administrator;
  }

  async resendInvitation(id: string): Promise<AdministratorListItem> {
    const administrator = await this.getAdministrator(id);
    const violations = resendViolations(administrator);
    if (violations.length > 0) throw refused(violations);
    await this.repository.revokePasswordLinks(id);
    await this.invitations.send(administrator);
    return administrator;
  }

  async deactivate(
    actor: AdminIdentity,
    id: string,
    now = new Date(),
  ): Promise<AdministratorListItem> {
    const administrator = await this.getAdministrator(id);
    const violations = deactivationViolations(
      administrator,
      actor.id,
      await this.repository.countActive(),
    );
    if (violations.length > 0) throw refused(violations);
    // The write checks again: a colleague may have deactivated someone else
    // meanwhile, or this one.
    const deactivated = await this.repository.deactivate({
      id,
      deactivatedById: actor.id,
      keepOneActive: administrator.status === 'ACTIVE',
      now,
    });
    if (!deactivated) {
      const current = await this.getAdministrator(id);
      throw refused(
        current.status === 'DEACTIVATED'
          ? ['ALREADY_DEACTIVATED']
          : ['LAST_ACTIVE'],
      );
    }
    return this.getAdministrator(id);
  }

  async reactivate(
    id: string,
    now = new Date(),
  ): Promise<AdministratorListItem> {
    const administrator = await this.getAdministrator(id);
    const violations = reactivationViolations(administrator);
    if (violations.length > 0) throw refused(violations);
    if (!(await this.repository.reactivate(id, now))) {
      throw refused(['NOT_DEACTIVATED']);
    }
    await this.invitations.send(administrator);
    return this.getAdministrator(id);
  }

  private async getAdministrator(id: string): Promise<AdministratorListItem> {
    const administrator = await this.repository.getAdministrator(id);
    if (!administrator) throw new NotFoundException('Administrator not found');
    return administrator;
  }
}
