import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { backup, conflictResolution = 'skip' } = body;

    if (!backup || !backup.tables) {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    const results: Record<string, { imported: number; skipped: number; errors: number }> = {};
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const [tableName, records] of Object.entries(backup.tables)) {
      if (!Array.isArray(records)) continue;
      results[tableName] = { imported: 0, skipped: 0, errors: 0 };

      for (const record of records) {
        try {
          let existingRecord = null;
          if (['teams', 'members', 'acquisitions', 'attendances', 'products'].includes(tableName)) {
            if (record.id) {
              const { data } = await supabase.from(tableName).select('id').eq('id', record.id).single();
              existingRecord = data;
            }
          }

          if (existingRecord) {
            if (conflictResolution === 'skip') {
              results[tableName].skipped++;
              totalSkipped++;
            } else if (conflictResolution === 'overwrite') {
              const { id, ...dataWithoutId } = record;
              if (tableName === 'acquisitions') {
                const { error } = await supabase.from(tableName).upsert(record, { onConflict: 'member_id,week,product_key' });
                if (error) throw error;
              } else if (tableName === 'attendances') {
                const { error } = await supabase.from(tableName).upsert(record, { onConflict: 'member_id,date' });
                if (error) throw error;
              } else {
                const { error } = await supabase.from(tableName).update(dataWithoutId).eq('id', record.id);
                if (error) throw error;
              }
              results[tableName].imported++;
              totalImported++;
            } else if (conflictResolution === 'merge') {
              if (tableName === 'acquisitions') {
                const { error } = await supabase.from(tableName).upsert(record, { onConflict: 'member_id,week,product_key' });
                if (error) throw error;
              } else if (tableName === 'attendances') {
                const { error } = await supabase.from(tableName).upsert(record, { onConflict: 'member_id,date' });
                if (error) throw error;
              } else {
                const { error } = await supabase.from(tableName).upsert(record);
                if (error) throw error;
              }
              results[tableName].imported++;
              totalImported++;
            }
          } else {
            const { error } = await supabase.from(tableName).insert(record);
            if (error) throw error;
            results[tableName].imported++;
            totalImported++;
          }
        } catch (error: any) {
          console.error(`Error importing record to ${tableName}:`, error);
          results[tableName].errors++;
          totalErrors++;
        }
      }
    }

    try {
      await supabase.from('backup_history').insert({
        backup_type: 'full',
        tables_included: Object.keys(backup.tables),
        record_count: totalImported,
        file_size_kb: Math.round(JSON.stringify(backup).length / 1024),
      });
    } catch (error) {
      console.log('backup_history table not available');
    }

    return NextResponse.json({
      success: true,
      message: 'Backup imported successfully',
      results,
      summary: { totalImported, totalSkipped, totalErrors },
    });
  } catch (error) {
    console.error('Error importing backup:', error);
    return NextResponse.json({ error: 'Failed to import backup' }, { status: 500 });
  }
}
