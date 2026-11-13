// src/core/prisma/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    // 🔧 CORREÇÃO: Pega a URL do ConfigService
    const databaseUrl = configService.get<string>('DATABASE_URL');

    console.log(
      '📦 DATABASE_URL carregada:',
      databaseUrl ? '✅ Sim' : '❌ Não',
    );

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: false,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
