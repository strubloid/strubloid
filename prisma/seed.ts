import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// Zen AI models — OpenCode Zen API
// ============================================================
const ZEN_MODELS = [
  { modelId: 'big-pickle',              name: 'Big Pickle',               endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'Default model',                    isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'deepseek-v4-flash-free',  name: 'DeepSeek V4 Flash',        endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'Fast reasoning model',           isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'mimo-v2.5-free',          name: 'MiMo V2.5',                endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'Xiaomi fast assistant',         isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'qwen3.6-plus-free',       name: 'Qwen3.6 Plus',             endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'Alibaba fast assistant',         isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'nemotron-3-ultra-free',   name: 'Nemotron 3 Ultra',         endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'NVIDIA reasoning',              isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'north-mini-code-free',    name: 'North Mini Code',          endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'zen', description: 'Coding focused model',          isFree: true,  inputPrice: null,  outputPrice: null  },
];

// ============================================================
// NVIDIA NIM models — build.nvidia.com free endpoints
// ============================================================
const NVIDIA_MODELS = [
  { modelId: 'meta/llama-3.3-70b-instruct',         name: 'Llama 3.3 70B',                endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Meta general-purpose instruct',   isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'nvidia/nemotron-3-ultra-550b-a55b',   name: 'Nemotron 3 Ultra 550B',         endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'NVIDIA hybrid MoE reasoning',     isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'mistralai/mistral-nemotron',           name: 'Mistral Nemotron',              endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Mistral × NVIDIA collaboration',  isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'microsoft/phi-4-mini-instruct',        name: 'Phi-4 Mini',                   endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Microsoft efficient instruct',   isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'qwen/qwq-32b',                         name: 'QwQ 32B',                      endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Qwen reasoning model',           isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'google/gemma-3-12b-it',                name: 'Gemma 3 12B',                  endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Google lightweight instruct',   isFree: true,  inputPrice: null,  outputPrice: null  },
  { modelId: 'deepseek-ai/deepseek-v4-flash',         name: 'DeepSeek V4 Flash (NVIDIA)',   endpoint: '/v1/chat/completions', provider: 'openai', modelSource: 'nvidia', description: 'Fast reasoning via NVIDIA NIM', isFree: true,  inputPrice: null,  outputPrice: null  },
];

async function main() {
  // Clear all existing models and re-seed
  await prisma.aiModel.deleteMany();

  for (const m of ZEN_MODELS) {
    await prisma.aiModel.create({ data: { ...m, isEnabled: true } });
    console.log(`✓ [zen] ${m.modelId} (${m.name})`);
  }

  for (const m of NVIDIA_MODELS) {
    await prisma.aiModel.create({ data: { ...m, isEnabled: true } });
    console.log(`✓ [nvidia] ${m.modelId} (${m.name})`);
  }

  // Set Zen default model if not set
  const existingZenDefault = await prisma.config.findUnique({ where: { key: 'zen_default_model' } });
  if (!existingZenDefault) {
    await prisma.config.create({
      data: { key: 'zen_default_model', value: 'big-pickle' },
    });
    console.log('✓ zen_default_model = big-pickle');
  }

  // Set NVIDIA defaults if not set
  const existingNvidiaDefault = await prisma.config.findUnique({ where: { key: 'nvidia_default_model' } });
  if (!existingNvidiaDefault) {
    await prisma.config.create({
      data: { key: 'nvidia_default_model', value: 'meta/llama-3.3-70b-instruct' },
    });
    console.log('✓ nvidia_default_model = meta/llama-3.3-70b-instruct');
  }

  const existingNvidiaBaseUrl = await prisma.config.findUnique({ where: { key: 'nvidia_api_base_url' } });
  if (!existingNvidiaBaseUrl) {
    await prisma.config.create({
      data: { key: 'nvidia_api_base_url', value: 'https://integrate.api.nvidia.com/v1' },
    });
    console.log('✓ nvidia_api_base_url = https://integrate.api.nvidia.com/v1');
  }

  console.log(`\nSeeded ${ZEN_MODELS.length} Zen + ${NVIDIA_MODELS.length} NVIDIA = ${ZEN_MODELS.length + NVIDIA_MODELS.length} total models`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); });
