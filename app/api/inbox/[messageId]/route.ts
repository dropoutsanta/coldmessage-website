import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient();
    const { messageId } = params;

    const { data: message, error } = await supabase
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
      .eq('id', messageId)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get thread (all messages in the same thread)
    let threadQuery = supabase
      .from('inbox_messages')
      .select(`
        *,
        leads (
          id,
          first_name,
          last_name,
          email,
          company,
          title
        )
      `)
      .order('received_at', { ascending: true });

    if (message.emailbison_thread_id) {
      threadQuery = threadQuery.eq('emailbison_thread_id', message.emailbison_thread_id);
    } else {
      // Fallback: get messages for same lead
      threadQuery = threadQuery.eq('lead_id', message.lead_id);
    }

    const { data: thread } = await threadQuery;

    return NextResponse.json({
      message,
      thread: thread || [],
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient();
    const { messageId } = params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.is_read !== undefined) {
      updates.is_read = body.is_read;
    }
    if (body.is_archived !== undefined) {
      updates.is_archived = body.is_archived;
    }

    const { data, error } = await supabase
      .from('inbox_messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

