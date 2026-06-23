import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(5000),
});

const BulkUpdateSchema = z.object({
  configs: z.array(UpdateConfigSchema),
});

export async function GET() {
  try {
    const configs = await db.config.findMany();
    const map: Record<string, string> = {};
    for (const c of configs) {
      map[c.key] = c.value;
    }
    return NextResponse.json({ configs: map });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load config', code: 'CONFIG_LOAD_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    for (const { key, value } of parsed.data.configs) {
      await db.config.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config', code: 'CONFIG_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}
