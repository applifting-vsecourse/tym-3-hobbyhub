import { AdministratorListItem } from '@/modules/administrator/domain/administrator';
import { AdministratorRepository } from '@/modules/administrator/repositories/administrator.repository';
import { AdminInvitations } from '@/shared/admin-auth/admin-invitations';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { AdministratorsService } from './administrators.service';

const actor = { id: 'a1', email: 'jana@example.com', name: 'Jana' };

const anAdministrator = (
  overrides: Partial<AdministratorListItem> = {},
): AdministratorListItem => ({
  id: 'a2',
  name: 'Petr',
  email: 'petr@example.com',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  status: 'ACTIVE',
  createdBy: { id: 'a1', name: 'Jana' },
  deactivatedAt: null,
  deactivatedBy: null,
  ...overrides,
});

const violationsOf = async (promise: Promise<unknown>): Promise<unknown> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  if (!(
    error instanceof BadRequestException || error instanceof ConflictException
  )) {
    throw new Error(`Expected a refusal, got ${String(error)}`);
  }
  return (error.getResponse() as { violations: unknown }).violations;
};

describe('AdministratorsService', () => {
  const setup = (): {
    repository: MockProxy<AdministratorRepository>;
    invitations: MockProxy<AdminInvitations>;
    service: AdministratorsService;
  } => {
    const repository = mock<AdministratorRepository>();
    const invitations = mock<AdminInvitations>();
    return {
      repository,
      invitations,
      service: new AdministratorsService(repository, invitations),
    };
  };

  describe('invite', () => {
    it('creates the account for the normalized address and sends the invitation', async () => {
      const { repository, invitations, service } = setup();
      const invited = anAdministrator({ status: 'INVITED' });
      repository.findByEmail.mockResolvedValue(null);
      repository.createInvited.mockResolvedValue(invited);
      const now = new Date('2026-11-13T10:00:00Z');

      await expect(
        service.invite(
          actor,
          { email: ' Petr@Example.com ', name: ' Petr ' },
          now,
        ),
      ).resolves.toBe(invited);

      expect(repository.findByEmail).toHaveBeenCalledWith('petr@example.com');
      expect(repository.createInvited).toHaveBeenCalledWith({
        email: 'petr@example.com',
        name: 'Petr',
        createdById: 'a1',
        now,
      });
      expect(invitations.send).toHaveBeenCalledWith(invited);
    });

    it('refuses a deactivated address so the page can offer reactivation', async () => {
      const { repository, invitations, service } = setup();
      repository.findByEmail.mockResolvedValue(
        anAdministrator({ status: 'DEACTIVATED' }),
      );

      await expect(
        violationsOf(
          service.invite(actor, { email: 'petr@example.com', name: 'Petr' }),
        ),
      ).resolves.toEqual(['DEACTIVATED_ADMINISTRATOR']);
      expect(repository.createInvited).not.toHaveBeenCalled();
      expect(invitations.send).not.toHaveBeenCalled();
    });

    it('refuses an address a colleague invited at the same moment', async () => {
      const { repository, invitations, service } = setup();
      repository.findByEmail.mockResolvedValue(null);
      repository.createInvited.mockResolvedValue(null);

      await expect(
        violationsOf(
          service.invite(actor, { email: 'petr@example.com', name: 'Petr' }),
        ),
      ).resolves.toEqual(['ALREADY_ADMINISTRATOR']);
      expect(invitations.send).not.toHaveBeenCalled();
    });
  });

  describe('resendInvitation', () => {
    it('revokes the old links before sending a new one', async () => {
      const { repository, invitations, service } = setup();
      const invited = anAdministrator({ status: 'INVITED' });
      repository.getAdministrator.mockResolvedValue(invited);

      await service.resendInvitation('a2');

      expect(repository.revokePasswordLinks).toHaveBeenCalledWith('a2');
      expect(invitations.send).toHaveBeenCalledWith(invited);
      expect(
        repository.revokePasswordLinks.mock.invocationCallOrder[0],
      ).toBeLessThan(invitations.send.mock.invocationCallOrder[0] ?? 0);
    });

    it('refuses someone who already set a password', async () => {
      const { repository, service } = setup();
      repository.getAdministrator.mockResolvedValue(anAdministrator());

      await expect(
        violationsOf(service.resendInvitation('a2')),
      ).resolves.toEqual(['NOT_INVITED']);
    });

    it('is not found for an unknown administrator', async () => {
      const { repository, service } = setup();
      repository.getAdministrator.mockResolvedValue(null);

      await expect(service.resendInvitation('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('deactivates an active colleague and keeps one active', async () => {
      const { repository, service } = setup();
      const deactivated = anAdministrator({ status: 'DEACTIVATED' });
      repository.getAdministrator
        .mockResolvedValueOnce(anAdministrator())
        .mockResolvedValueOnce(deactivated);
      repository.countActive.mockResolvedValue(2);
      repository.deactivate.mockResolvedValue(true);
      const now = new Date('2026-11-13T10:00:00Z');

      await expect(service.deactivate(actor, 'a2', now)).resolves.toBe(
        deactivated,
      );
      expect(repository.deactivate).toHaveBeenCalledWith({
        id: 'a2',
        deactivatedById: 'a1',
        keepOneActive: true,
        now,
      });
    });

    it('refuses oneself without writing anything', async () => {
      const { repository, service } = setup();
      repository.getAdministrator.mockResolvedValue(
        anAdministrator({ id: 'a1' }),
      );
      repository.countActive.mockResolvedValue(3);

      await expect(
        violationsOf(service.deactivate(actor, 'a1')),
      ).resolves.toEqual(['SELF']);
      expect(repository.deactivate).not.toHaveBeenCalled();
    });

    it('says LAST_ACTIVE when a colleague was removed meanwhile', async () => {
      const { repository, service } = setup();
      repository.getAdministrator.mockResolvedValue(anAdministrator());
      repository.countActive.mockResolvedValue(2);
      repository.deactivate.mockResolvedValue(false);

      await expect(
        violationsOf(service.deactivate(actor, 'a2')),
      ).resolves.toEqual(['LAST_ACTIVE']);
    });

    it('cancels an invitation without the last-active lock', async () => {
      const { repository, service } = setup();
      repository.getAdministrator.mockResolvedValue(
        anAdministrator({ status: 'INVITED' }),
      );
      repository.countActive.mockResolvedValue(1);
      repository.deactivate.mockResolvedValue(true);

      await service.deactivate(actor, 'a2');

      expect(repository.deactivate).toHaveBeenCalledWith(
        expect.objectContaining({ keepOneActive: false }),
      );
    });
  });

  describe('reactivate', () => {
    it('clears the old access and sends a new invitation', async () => {
      const { repository, invitations, service } = setup();
      const deactivated = anAdministrator({ status: 'DEACTIVATED' });
      repository.getAdministrator
        .mockResolvedValueOnce(deactivated)
        .mockResolvedValueOnce(anAdministrator({ status: 'INVITED' }));
      repository.reactivate.mockResolvedValue(true);

      await expect(service.reactivate('a2')).resolves.toMatchObject({
        status: 'INVITED',
      });
      expect(invitations.send).toHaveBeenCalledWith(deactivated);
    });

    it('refuses an administrator who is not deactivated', async () => {
      const { repository, invitations, service } = setup();
      repository.getAdministrator.mockResolvedValue(anAdministrator());

      await expect(violationsOf(service.reactivate('a2'))).resolves.toEqual([
        'NOT_DEACTIVATED',
      ]);
      expect(invitations.send).not.toHaveBeenCalled();
    });
  });
});
