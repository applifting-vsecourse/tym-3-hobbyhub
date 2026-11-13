import { AdministratorListItem } from '@/modules/administrator/domain/administrator';
import { AdministratorRepository } from '@/modules/administrator/repositories/administrator.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdministratorsService {
  constructor(private readonly repository: AdministratorRepository) {}

  listAdministrators(): Promise<AdministratorListItem[]> {
    return this.repository.listAdministrators();
  }
}
