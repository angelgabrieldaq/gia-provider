import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma v7 with prisma-client generator requires a driver adapter.
// PrismaClient is a const (not a class), so we use composition instead of inheritance.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: InstanceType<typeof PrismaClient>;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
    this._client = new (PrismaClient as any)({ adapter });
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
