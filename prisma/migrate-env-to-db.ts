import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateApiKey() {
  // Check if config already has a zen_api_key
  const existing = await prisma.config.findUnique({ where: { key: 'zen_api_key' } });
  if (existing) {
    console.log('zen_api_key already exists in Config table, skipping migration.');
    return;
  }

  // Try to read the API key from the env (set via .env)
  const apiKey = process.env.BIGPICKLE_API_KEY || process.env.ZEN_API_KEY;
  if (!apiKey) {
    console.log('No BIGPICKLE_API_KEY or ZEN_API_KEY found in environment.');
    console.log('You can set it later in the admin settings page.');
    return;
  }

  await prisma.config.upsert({
    where: { key: 'zen_api_key' },
    update: { value: apiKey },
    create: { key: 'zen_api_key', value: apiKey },
  });

  console.log('Migrated API key from environment to Config table.');

  // Also set default model and base URL
  await prisma.config.upsert({
    where: { key: 'zen_api_base_url' },
    update: { value: 'https://opencode.ai/zen/v1' },
    create: { key: 'zen_api_base_url', value: 'https://opencode.ai/zen/v1' },
  });
}

migrateApiKey()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
