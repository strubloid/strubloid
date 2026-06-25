import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { resolve } from 'path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || `file:${resolve(process.cwd(), 'prisma/dev.db')}`,
});

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
