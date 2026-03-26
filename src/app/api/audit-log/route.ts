import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface AuditLogEntry {
  member_id: string;
  member_name: string;
  date: string;
  product_key: string;
  product_name?: string;
  old_quantity: number;
  new_quantity: number;
  changed_at: string;
  unit?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { logs } = body as { logs: AuditLogEntry[] };

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: 'No audit logs provided' }, { status: 400 });
    }

    console.log('[Audit Log API] Received', logs.length, 'entries');

    // Prepare data for insertion
    const auditData = logs.map(log => ({
      member_id: log.member_id,
      member_name: log.member_name,
      date: log.date,
      product_key: log.product_key,
      old_quantity: log.old_quantity,
      new_quantity: log.new_quantity,
      changed_at: log.changed_at || new Date().toISOString()
    }));

    // Insert into database
    const { data, error } = await supabase
      .from('acquisition_audit_log')
      .insert(auditData)
      .select();

    if (error) {
      console.error('[Audit Log API] Insert error:', error);
      throw error;
    }

    console.log('[Audit Log API] Successfully saved', data?.length, 'audit logs');
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[Audit Log API] Error:', error);
    return NextResponse.json({ error: 'Failed to save audit logs' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase.from('acquisition_audit_log').select('*');

    if (memberId) query = query.eq('member_id', memberId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Audit Log API] Error fetching:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
