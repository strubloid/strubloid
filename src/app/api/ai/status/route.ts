import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Load all provider configs to determine status
    const rows = await db.config.findMany();

    const configMap = new Map<string, string>(rows.map((r) => [r.key, r.value]));

    const zenApiKey = configMap.get('zen_api_key') || '';
    const nvidiaApiKey = configMap.get('nvidia_api_key') || '';

    return NextResponse.json({
      providers: {
        zen: {
          providerName: 'Zen AI',
          isConfigured: zenApiKey.length > 0,
          isUsingDevMode: !zenApiKey,
          apiUrl: configMap.get('zen_api_base_url') || 'https://opencode.ai/zen',
        },
        nvidia: {
          providerName: 'NVIDIA NIM',
          isConfigured: nvidiaApiKey.length > 0,
          isUsingDevMode: !nvidiaApiKey,
          apiUrl: configMap.get('nvidia_api_base_url') || 'https://integrate.api.nvidia.com/v1',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get AI status', code: 'AI_STATUS_ERROR' },
      { status: 500 }
    );
  }
}
