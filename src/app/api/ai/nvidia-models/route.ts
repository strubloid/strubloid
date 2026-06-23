import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const configs = await db.config.findMany();
    const configMap = new Map<string, string>(configs.map((r) => [r.key, r.value]));

    const baseUrl = configMap.get('nvidia_api_base_url') || 'https://integrate.api.nvidia.com/v1';

    const apiKey = configMap.get('nvidia_api_key') || process.env.NVIDIA_API_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${baseUrl}/models`, { headers });

    if (!res.ok) {
      return NextResponse.json(
        { error: `NVIDIA API returned ${res.status}`, code: 'NVIDIA_API_ERROR' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch NVIDIA models', code: 'NVIDIA_PROXY_ERROR' },
      { status: 500 }
    );
  }
}
