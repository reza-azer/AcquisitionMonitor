import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tables = searchParams.get('tables')?.split(',') || ['teams', 'members', 'acquisitions', 'attendances', 'products'];

    const backup: Record<string, any> = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tables: {} as Record<string, any[]>,
    };

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error exporting ${table}:`, error);
        backup.tables[table] = [];
      } else {
        backup.tables[table] = data || [];
      }
    }

    const stats = {
      totalRecords: Object.values(backup.tables).reduce((sum: number, records) => sum + (records as any[]).length, 0),
      tablesCount: tables.length,
      tablesBreakdown: Object.fromEntries(tables.map(table => [table, backup.tables[table]?.length || 0])),
    };

    backup.stats = stats;
    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error exporting backup:', error);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}
