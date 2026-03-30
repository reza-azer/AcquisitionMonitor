import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    const week = searchParams.get('week');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase.from('acquisitions').select('*');

    if (memberId) query = query.eq('member_id', memberId);
    if (week) query = query.eq('week', parseInt(week));
    if (date) query = query.eq('date', date);

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (startDate) {
      query = query.gte('date', startDate);
    } else if (endDate) {
      query = query.lte('date', endDate);
    }

    // Always order by updated_at DESC to show most recently saved/updated entries first
    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    
    console.log('[Acquisitions API] GET success:', data?.length || 0, 'entries');
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Acquisitions API] Error fetching acquisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch acquisitions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bulk, records, member_id, week, date, product_key, quantity, nominal, is_credit_entry } = body;

    // Handle bulk operations
    if (bulk && Array.isArray(records)) {
      console.log('[Acquisitions API] Bulk POST received:', records.length, 'records');
      console.log('[Acquisitions API] First record:', records[0]);

      // Prepare records with week calculation and updated_at
      const insertRecords = records.map((record: any) => {
        const inputDate = record.date || new Date().toISOString().split('T')[0];
        const inputWeek = record.week || getWeekOfMonth(new Date(inputDate));
        return {
          member_id: record.member_id,
          week: inputWeek,
          date: inputDate,
          product_key: record.product_key,
          quantity: record.quantity,
          nominal: record.nominal || 0,
          updated_at: new Date().toISOString()
        };
      });

      // Check if any records are CREDIT entries
      const hasCreditEntries = records.some((r: any) => r.is_credit_entry === true);
      console.log('[Acquisitions API] Has credit entries:', hasCreditEntries);

      if (hasCreditEntries) {
        // For CREDIT: delete existing entries first, then insert
        const sampleRecord = records[0];
        console.log('[Acquisitions API] Deleting existing entries for:', {
          member_id: sampleRecord.member_id,
          date: sampleRecord.date,
          product_key: sampleRecord.product_key
        });

        // First, check what exists
        const { data: existingData } = await supabase
          .from('acquisitions')
          .select('id, quantity, nominal')
          .eq('member_id', sampleRecord.member_id)
          .eq('date', sampleRecord.date)
          .eq('product_key', sampleRecord.product_key);

        console.log('[Acquisitions API] Existing records before delete:', existingData);

        // Delete existing entries for the same member/date/product
        const { error: deleteError, count: deletedCount } = await supabase
          .from('acquisitions')
          .delete()
          .eq('member_id', sampleRecord.member_id)
          .eq('date', sampleRecord.date)
          .eq('product_key', sampleRecord.product_key)
          .select();

        if (deleteError) {
          console.error('[Acquisitions API] Delete error:', deleteError);
          throw deleteError;
        }

        console.log('[Acquisitions API] Deleted records:', deleteError);

        // Verify delete worked
        const { data: afterDeleteData } = await supabase
          .from('acquisitions')
          .select('id')
          .eq('member_id', sampleRecord.member_id)
          .eq('date', sampleRecord.date)
          .eq('product_key', sampleRecord.product_key);

        console.log('[Acquisitions API] Records after delete:', afterDeleteData?.length || 0);

        // Insert new records
        const { data, error } = await supabase
          .from('acquisitions')
          .insert(insertRecords)
          .select();

        if (error) {
          console.error('[Acquisitions API] Insert error:', error);
          // Check what's in the table now
          const { data: conflictData } = await supabase
            .from('acquisitions')
            .select('id, member_id, date, product_key, quantity, nominal')
            .eq('member_id', sampleRecord.member_id)
            .eq('date', sampleRecord.date)
            .eq('product_key', sampleRecord.product_key);
          console.error('[Acquisitions API] Conflict - current records:', conflictData);
          throw error;
        }

        console.log('[Acquisitions API] Bulk insert success:', data?.length, 'records');
        return NextResponse.json({ success: true, count: data?.length || 0, data }, { status: 201 });
      } else {
        // For FUNDING/TRANSACTION: use upsert (existing behavior)
        console.log('[Acquisitions API] Bulk upserting:', insertRecords.length, 'records');

        const { data, error } = await supabase
          .from('acquisitions')
          .upsert(insertRecords, {
            onConflict: 'member_id,date,product_key'
          })
          .select();

        if (error) {
          console.error('[Acquisitions API] Bulk upsert error:', error);
          throw error;
        }

        console.log('[Acquisitions API] Bulk upsert success:', data?.length, 'records');
        return NextResponse.json({ success: true, count: data?.length || 0, data }, { status: 201 });
      }
    }

    // Handle single record
    console.log('[Acquisitions API] POST received:', { member_id, week, date, product_key, quantity, nominal });

    // Use today's date if not provided
    const inputDate = date || new Date().toISOString().split('T')[0];

    // Calculate week number within the month (1-4) if not provided
    // Week calculation: Week 1 = days 1-7, Week 2 = days 8-14, Week 3 = days 15-21, Week 4 = days 22-31
    // This matches the database migration and analytics API calculation
    const inputWeek = week || getWeekOfMonth(new Date(inputDate));

    const upsertData = {
      member_id,
      week: inputWeek,
      date: inputDate,
      product_key,
      quantity,
      nominal: nominal || 0,
      updated_at: new Date().toISOString()
    };

    console.log('[Acquisitions API] Upserting:', upsertData);

    // Upsert: insert or update on conflict (member_id, date, product_key)
    const { data, error } = await supabase
      .from('acquisitions')
      .upsert([upsertData], {
        onConflict: 'member_id,date,product_key'
      })
      .select()
      .single();

    if (error) {
      console.error('[Acquisitions API] Upsert error:', error);
      throw error;
    }

    console.log('[Acquisitions API] Upsert success:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Acquisitions API] Error saving acquisition:', error);
    return NextResponse.json({ error: 'Failed to save acquisition' }, { status: 500 });
  }
}

/**
 * Calculate week of month from a date (1-4)
 * Formula: CEIL(day_of_month / 7)
 * - Week 1: days 1-7
 * - Week 2: days 8-14
 * - Week 3: days 15-21
 * - Week 4: days 22-31 (caps at 4)
 * 
 * This matches the SQL migration calculation: CEIL(EXTRACT(DAY FROM date) / 7.0)
 */
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  // Simple ceiling division by 7
  const weekNum = Math.ceil(day / 7);
  // Cap at 4 for days 29-31
  return Math.min(weekNum, 4);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bulk = searchParams.get('bulk');

    // Handle bulk delete
    if (bulk === 'true') {
      const body = await request.json();
      const { records } = body;

      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ error: 'Records array required' }, { status: 400 });
      }

      console.log('[Acquisitions API] Bulk DELETE received:', records.length, 'records');

      // Build filter conditions for bulk delete
      // We need to delete by (member_id, date) pairs
      // Since Supabase doesn't support composite IN, we'll delete in batches
      const deletePromises = records.map((record: { member_id: string; date: string }) =>
        supabase
          .from('acquisitions')
          .delete()
          .eq('member_id', record.member_id)
          .eq('date', record.date)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('[Acquisitions API] Bulk delete errors:', errors);
        throw new Error('Some deletions failed');
      }

      console.log('[Acquisitions API] Bulk delete success');
      return NextResponse.json({ success: true, count: records.length });
    }

    // Handle single delete
    if (!id) {
      return NextResponse.json({ error: 'Acquisition ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('acquisitions').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting acquisition:', error);
    return NextResponse.json({ error: 'Failed to delete acquisition' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, member_id, date, product_key, quantity, member_name } = body;

    console.log('[Acquisitions API] PATCH received:', { id, member_id, date, product_key, quantity });

    if (!id) {
      return NextResponse.json({ error: 'Acquisition ID required' }, { status: 400 });
    }

    // Fetch existing data for audit log
    const { data: existingData } = await supabase
      .from('acquisitions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingData) {
      return NextResponse.json({ error: 'Acquisition not found' }, { status: 404 });
    }

    const oldQuantity = existingData.quantity;
    const updateDate = date || existingData.date;

    // Recalculate week from date to ensure consistency
    const updateWeek = getWeekOfMonth(new Date(updateDate));

    // Update the acquisition
    const { data, error } = await supabase
      .from('acquisitions')
      .update({
        date: updateDate,
        week: updateWeek,
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Acquisitions API] Update error:', error);
      throw error;
    }

    // Create audit log if quantity changed
    if (oldQuantity !== quantity && member_name) {
      const auditLog = {
        member_id,
        member_name,
        date: updateDate,
        product_key,
        old_quantity: oldQuantity,
        new_quantity: quantity,
        changed_at: new Date().toISOString()
      };

      await supabase.from('acquisition_audit_log').insert([auditLog]);
      console.log('[Acquisitions API] Audit log created for update:', auditLog);
    }

    console.log('[Acquisitions API] Update success:', data);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[Acquisitions API] Error updating acquisition:', error);
    return NextResponse.json({ error: 'Failed to update acquisition' }, { status: 500 });
  }
}
