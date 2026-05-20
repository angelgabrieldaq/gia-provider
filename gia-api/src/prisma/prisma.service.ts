import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

// Prisma v7 generates PrismaClient as a const (not a class), so we use
// composition instead of inheritance. Models are exposed via getters.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: InstanceType<typeof PrismaClient>;

  constructor() {
    this._client = new (PrismaClient as any)({});
  }

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }

  // Expose models
  get patient()           { return this._client.patient; }
  get pregnancy()         { return this._client.pregnancy; }
  get consultation()      { return this._client.consultation; }
  get clinicalAlertLog()  { return this._client.clinicalAlertLog; }

  // Expose transaction API
  get $transaction()      { return this._client.$transaction.bind(this._client); }
}
