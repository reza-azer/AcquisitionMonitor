import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, new_team_id, migrate_data } = body;

    if (!member_id || !new_team_id) {
      return NextResponse.json({ error: 'Member ID and new team ID required' }, { status: 400 });
    }

    // First, get the member's current data
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, team_id')
      .eq('id', member_id)
      .single();

    if (memberError) throw memberError;
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const old_team_id = member.team_id;

    // Update member's team
    const { error: updateError } = await supabase
      .from('members')
      .update({ team_id: new_team_id })
      .eq('id', member_id);

    if (updateError) throw updateError;

    // If migrate_data is true, migrate all acquisitions
    if (migrate_data) {
      const { data: acquisitions, error: acqFetchError } = await supabase
        .from('acquisitions')
        .select('*')
        .eq('member_id', member_id);

      if (acqFetchError) throw acqFetchError;

      // Acquisitions are already linked to member_id, so they automatically follow the member
      // No need to update acquisitions since they reference member_id, not team_id
    } else {
      // If not migrating data, delete all acquisitions for this member
      const { error: deleteError } = await supabase
        .from('acquisitions')
        .delete()
        .eq('member_id', member_id);

      if (deleteError) throw deleteError;
    }

    return NextResponse.json({ 
      success: true, 
      member_id, 
      old_team_id, 
      new_team_id,
      data_migrated: migrate_data
    });
  } catch (error) {
    console.error('Error migrating member:', error);
    return NextResponse.json({ error: 'Failed to migrate member' }, { status: 500 });
  }
}
