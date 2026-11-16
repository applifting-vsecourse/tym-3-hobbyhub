import { AdministratorsService } from '@/modules/administrator/services/administrators.service';
import { EventsService } from '@/modules/event/services/events.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { PublicProfile } from '@/modules/profile/domain/profile';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { ReportReasonsService } from '@/modules/report-reason/services/report-reasons.service';
import { AdminReportDetail } from '@/modules/report/domain/report';
import { ReportRepository } from '@/modules/report/repositories/report.repository';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { ReportsService } from './reports.service';

// #240, ADR-0023.

const user = { id: 'u1' } as Identity;
const admin = {
  id: 'a1',
  email: 'a1@example.com',
  name: 'Správkyně',
} as AdminIdentity;
const NOW = new Date('2030-01-01T12:00:00Z');
const TEXT = 'Po akci mi opakovaně psal, i když jsem chtěla, ať přestane.';
const NOTE = 'Dvojice zablokována, nahlášení odpovídá.';

const aDetail: AdminReportDetail = {
  id: 'r1',
  status: 'IN_PROGRESS',
  createdAt: NOW,
  target: { type: 'USER', id: 'u2', name: 'Petr' },
  reason: { id: 'reason1', name: 'Obtěžování nebo vyhrožování' },
  reporter: { id: 'u1', name: 'Jana' },
  assignee: { id: 'a1', name: 'Správkyně' },
  text: TEXT,
  resolutionNote: null,
  resolvedAt: null,
  otherOpenReports: [],
  history: [],
};

describe('ReportsService', () => {
  type Setup = {
    repository: MockProxy<ReportRepository>;
    reasons: MockProxy<ReportReasonsService>;
    events: MockProxy<EventsService>;
    profiles: MockProxy<ProfileService>;
    administrators: MockProxy<AdministratorsService>;
    notifications: MockProxy<NotificationsService>;
    service: ReportsService;
  };

  const setup = (): Setup => {
    const repository = mock<ReportRepository>();
    repository.create.mockResolvedValue({ id: 'r1', createdAt: NOW });
    repository.getDetail.mockResolvedValue(aDetail);
    repository.assign.mockResolvedValue(true);
    repository.reopen.mockResolvedValue(true);
    repository.resolve.mockResolvedValue({
      reporterId: 'u1',
      notifyReporter: true,
    });
    const reasons = mock<ReportReasonsService>();
    reasons.isAvailable.mockResolvedValue(true);
    const events = mock<EventsService>();
    events.getVisibleEventOrganizerIds.mockResolvedValue(['u2']);
    const profiles = mock<ProfileService>();
    profiles.getPublicProfile.mockResolvedValue({ id: 'u2' } as PublicProfile);
    const administrators = mock<AdministratorsService>();
    const notifications = mock<NotificationsService>();
    return {
      repository,
      reasons,
      events,
      profiles,
      administrators,
      notifications,
      service: new ReportsService(
        repository,
        reasons,
        events,
        profiles,
        administrators,
        notifications,
      ),
    };
  };

  describe('report', () => {
    it('files a report of a user the reporter may see, with the text trimmed', async () => {
      const { service, repository, profiles } = setup();

      await expect(
        service.report(user, {
          target: { type: 'USER', id: 'u2' },
          reasonId: 'reason1',
          text: `  ${TEXT}  `,
        }),
      ).resolves.toEqual({ id: 'r1', createdAt: NOW });
      expect(profiles.getPublicProfile).toHaveBeenCalledWith('u2', user);
      expect(repository.create).toHaveBeenCalledWith({
        reporterId: 'u1',
        target: { type: 'USER', id: 'u2' },
        reasonId: 'reason1',
        text: TEXT,
      });
    });

    it('files a report of an event the reporter may see', async () => {
      const { service, repository, events } = setup();

      await service.report(user, {
        target: { type: 'EVENT', id: 'e1' },
        reasonId: 'reason1',
        text: TEXT,
      });

      expect(events.getVisibleEventOrganizerIds).toHaveBeenCalledWith(
        'e1',
        user,
      );
      expect(repository.create).toHaveBeenCalled();
    });

    it('refuses a report of oneself before looking anything up', async () => {
      const { service, repository, profiles } = setup();

      await expect(
        service.report(user, {
          target: { type: 'USER', id: 'u1' },
          reasonId: 'reason1',
          text: TEXT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(profiles.getPublicProfile).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a report of an event the reporter organizes', async () => {
      const { service, repository, events } = setup();
      events.getVisibleEventOrganizerIds.mockResolvedValue(['u9', 'u1']);

      await expect(
        service.report(user, {
          target: { type: 'EVENT', id: 'e1' },
          reasonId: 'reason1',
          text: TEXT,
        }),
      ).rejects.toMatchObject({
        response: { violations: ['OWN_EVENT'] },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it.each([
      ['an event', 'EVENT'],
      ['a user', 'USER'],
    ] as const)(
      'passes on the not found of %s the reporter may not see, and files nothing',
      async (_, type) => {
        const { service, repository, events, profiles } = setup();
        events.getVisibleEventOrganizerIds.mockRejectedValue(
          new NotFoundException('Event not found'),
        );
        profiles.getPublicProfile.mockRejectedValue(
          new NotFoundException('User not found'),
        );

        await expect(
          service.report(user, {
            target: { type, id: 'x1' },
            reasonId: 'reason1',
            text: TEXT,
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('refuses an unknown reason', async () => {
      const { service, reasons, repository } = setup();
      reasons.isAvailable.mockResolvedValue(false);

      await expect(
        service.report(user, {
          target: { type: 'USER', id: 'u2' },
          reasonId: 'nope',
          text: TEXT,
        }),
      ).rejects.toMatchObject({
        response: { violations: ['UNKNOWN_REASON'] },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('answers 409 while the reporter has an open report about the target', async () => {
      const { service, repository } = setup();
      repository.create.mockResolvedValue(null);

      await expect(
        service.report(user, {
          target: { type: 'USER', id: 'u2' },
          reasonId: 'reason1',
          text: TEXT,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('assign', () => {
    it('lets the administrator take a new report over', async () => {
      const { service, repository, administrators } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });

      await expect(service.assign(admin, 'r1')).resolves.toBe(aDetail);
      expect(administrators.getActiveAdministrator).not.toHaveBeenCalled();
      expect(repository.assign).toHaveBeenCalledWith({
        id: 'r1',
        expected: { status: 'NEW', assigneeId: null },
        adminId: 'a1',
        assignee: { id: 'a1', name: 'Správkyně' },
      });
    });

    it('hands a report to an active colleague', async () => {
      const { service, repository, administrators } = setup();
      repository.getState.mockResolvedValue({
        status: 'IN_PROGRESS',
        assigneeId: 'a1',
      });
      administrators.getActiveAdministrator.mockResolvedValue({
        id: 'a2',
        name: 'Kolega',
      });

      await service.assign(admin, 'r1', 'a2');

      expect(repository.assign).toHaveBeenCalledWith(
        expect.objectContaining({ assignee: { id: 'a2', name: 'Kolega' } }),
      );
    });

    it('refuses to hand a report to someone who cannot sign in', async () => {
      const { service, repository, administrators } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });
      administrators.getActiveAdministrator.mockResolvedValue(null);

      await expect(service.assign(admin, 'r1', 'a9')).rejects.toMatchObject({
        response: { violations: ['ASSIGNEE_NOT_ACTIVE'] },
      });
      expect(repository.assign).not.toHaveBeenCalled();
    });

    it('refuses a resolved report', async () => {
      const { service, repository } = setup();
      repository.getState.mockResolvedValue({
        status: 'RESOLVED',
        assigneeId: 'a2',
      });

      await expect(service.assign(admin, 'r1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.assign).not.toHaveBeenCalled();
    });

    it('answers 409 when a colleague changed the report meanwhile', async () => {
      const { service, repository } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });
      repository.assign.mockResolvedValue(false);

      await expect(service.assign(admin, 'r1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('is not found for an unknown report', async () => {
      const { service, repository } = setup();
      repository.getState.mockResolvedValue(null);

      await expect(service.assign(admin, 'r9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('resolve', () => {
    it('resolves with the note trimmed and tells the reporter', async () => {
      const { service, repository, notifications } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });

      await service.resolve(admin, 'r1', `  ${NOTE} `, NOW);

      expect(repository.resolve).toHaveBeenCalledWith({
        id: 'r1',
        expected: { status: 'NEW', assigneeId: null },
        adminId: 'a1',
        note: NOTE,
        now: NOW,
      });
      expect(notifications.notifyReportResolved).toHaveBeenCalledWith({
        reporterId: 'u1',
      });
    });

    it('does not tell the reporter a second time after reopening', async () => {
      const { service, repository, notifications } = setup();
      repository.getState.mockResolvedValue({
        status: 'IN_PROGRESS',
        assigneeId: 'a1',
      });
      repository.resolve.mockResolvedValue({
        reporterId: 'u1',
        notifyReporter: false,
      });

      await service.resolve(admin, 'r1', NOTE, NOW);

      expect(notifications.notifyReportResolved).not.toHaveBeenCalled();
    });

    it('refuses a resolved report and tells nobody', async () => {
      const { service, repository, notifications } = setup();
      repository.getState.mockResolvedValue({
        status: 'RESOLVED',
        assigneeId: 'a1',
      });

      await expect(
        service.resolve(admin, 'r1', NOTE, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.resolve).not.toHaveBeenCalled();
      expect(notifications.notifyReportResolved).not.toHaveBeenCalled();
    });

    it('answers 409 and tells nobody when a colleague changed the report meanwhile', async () => {
      const { service, repository, notifications } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });
      repository.resolve.mockResolvedValue(null);

      await expect(
        service.resolve(admin, 'r1', NOTE, NOW),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notifications.notifyReportResolved).not.toHaveBeenCalled();
    });
  });

  describe('reopen', () => {
    it('reopens a resolved report', async () => {
      const { service, repository } = setup();
      repository.getState.mockResolvedValue({
        status: 'RESOLVED',
        assigneeId: 'a2',
      });

      await service.reopen(admin, 'r1');

      expect(repository.reopen).toHaveBeenCalledWith({
        id: 'r1',
        expected: { status: 'RESOLVED', assigneeId: 'a2' },
        adminId: 'a1',
      });
    });

    it('refuses a report that is still open', async () => {
      const { service, repository } = setup();
      repository.getState.mockResolvedValue({
        status: 'NEW',
        assigneeId: null,
      });

      await expect(service.reopen(admin, 'r1')).rejects.toMatchObject({
        response: { violations: ['NOT_RESOLVED'] },
      });
      expect(repository.reopen).not.toHaveBeenCalled();
    });
  });

  describe('the reports of a user and of an event', () => {
    it('is not found for an unknown user', async () => {
      const { service, repository } = setup();
      repository.userExists.mockResolvedValue(false);

      await expect(service.listOfUser('u9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists the reports about the user and the ones they filed', async () => {
      const { service, repository } = setup();
      repository.userExists.mockResolvedValue(true);
      repository.listAboutUser.mockResolvedValue([]);
      repository.listFiledBy.mockResolvedValue([]);

      await expect(service.listOfUser('u2')).resolves.toEqual({
        about: [],
        filed: [],
      });
      expect(repository.listAboutUser).toHaveBeenCalledWith('u2');
      expect(repository.listFiledBy).toHaveBeenCalledWith('u2');
    });

    it('is not found for an unknown event', async () => {
      const { service, repository } = setup();
      repository.eventExists.mockResolvedValue(false);

      await expect(service.listOfEvent('e9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
