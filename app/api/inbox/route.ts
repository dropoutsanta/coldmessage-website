import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const campaignId = searchParams.get('campaignId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const interestedOnly = searchParams.get('interestedOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('inbox_messages')
      .select(`
        *,
        leads (
          id,
          first_name,
          last_name,
          email,
          company,
          title,
          profile_picture_url,
          campaign_id
        ),
        campaigns (
          id,
          slug,
          company_name
        )
      `)
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (interestedOnly) {
      query = query.eq('is_interested', true);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching inbox messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get unread count
    let unreadCountQuery = supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .eq('is_read', false);

    if (campaignId) {
      unreadCountQuery = unreadCountQuery.eq('campaign_id', campaignId);
    }

    const { count: unreadCount } = await unreadCountQuery;

    return NextResponse.json({
      messages: messages || [],
      unreadCount: unreadCount || 0,
      total: messages?.length || 0,
    });
  } catch (error) {
    console.error('Error in inbox GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

