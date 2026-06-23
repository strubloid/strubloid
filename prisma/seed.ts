import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real models from OpenCode /v1/models endpoint
const MODELS = [
  { modelId: 'big-pickle',              name: 'Big Pickle',               endpoint: '/v1/chat/completions', provider: 'openai',  description: 'Default model',                    isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'deepseek-v4-flash-free',  name: 'DeepSeek V4 Flash',        endpoint: '/v1/chat/completions', provider: 'openai',  description: 'Fast reasoning model',           isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'mimo-v2.5-free',          name: 'MiMo V2.5',                endpoint: '/v1/chat/completions', provider: 'openai',  description: 'Xiaomi fast assistant',         isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'qwen3.6-plus-free',       name: 'Qwen3.6 Plus',             endpoint: '/v1/chat/completions', provider: 'openai',  description: 'Alibaba fast assistant',         isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'nemotron-3-ultra-free',   name: 'Nemotron 3 Ultra',         endpoint: '/v1/chat/completions', provider: 'openai',  description: 'NVIDIA reasoning',              isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'north-mini-code-free',    name: 'North Mini Code',          endpoint: '/v1/chat/completions', provider: 'openai',  description: 'Coding focused model',          isFree: true,  inputPrice: null,  outputPrice: null  },
];

async function main() {
  // Clear all existing models and re-seed with only real models
  await prisma.aiModel.deleteMany();

  for (const m of MODELS) {
    await prisma.aiModel.create({ data: { ...m, isEnabled: true } });
    console.log(`✓ ${m.modelId} (${m.name})`);
  }

  // Set default model if not set
  const existingDefault = await prisma.config.findUnique({ where: { key: 'zen_default_model' } });
  if (!existingDefault) {
    await prisma.config.create({
      data: { key: 'zen_default_model', value: 'big-pickle' },
    });
    console.log('✓ zen_default_model = big-pickle');
  }

  console.log(`\nSeeded ${MODELS.length} models`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); });