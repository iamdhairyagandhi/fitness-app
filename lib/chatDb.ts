/**
 * Chat persistence — Supabase CRUD for conversations and messages
 */

import { supabase } from '@/lib/supabase';
import type { ChatConversation, ChatMessage } from '@/types';

// ── Conversations ────────────────────────────────────────────

export async function fetchConversations(userId: string): Promise<ChatConversation[]> {
    const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);

    if (error) {
        console.warn('fetchConversations error:', error.message);
        return [];
    }
    return data || [];
}

export async function createConversation(userId: string, title: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId, title })
        .select('id')
        .single();

    if (error) {
        console.warn('createConversation error:', error.message);
        return null;
    }
    return data?.id || null;
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    await supabase
        .from('chat_conversations')
        .update({ title })
        .eq('id', conversationId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
    await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);
}

// ── Messages ─────────────────────────────────────────────────

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.warn('fetchMessages error:', error.message);
        return [];
    }

    return (data || []).map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.created_at,
        metadata: m.metadata,
    }));
}

export async function saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
): Promise<string | null> {
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            metadata: metadata || {},
        })
        .select('id')
        .single();

    if (error) {
        console.warn('saveMessage error:', error.message);
        return null;
    }

    // Touch conversation updated_at
    await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data?.id || null;
}

// ── Weekly Reports ───────────────────────────────────────────

export async function fetchWeeklyReports(userId: string, limit = 10) {
    const { data, error } = await supabase
        .from('ai_weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(limit);

    if (error) {
        console.warn('fetchWeeklyReports error:', error.message);
        return [];
    }
    return data || [];
}

export async function saveWeeklyReport(report: {
    user_id: string;
    week_start: string;
    week_end: string;
    workouts_completed: number;
    total_volume_kg: number;
    avg_calories: number;
    avg_protein_g: number;
    weight_change_kg: number;
    new_prs: number;
    streak_days: number;
    recovery_avg: number;
    ai_summary: string;
    ai_recommendations: string[];
    highlights: string[];
    correlation_insights: unknown[];
}): Promise<void> {
    const { error } = await supabase
        .from('ai_weekly_reports')
        .upsert(report, { onConflict: 'user_id,week_start' });

    if (error) console.warn('saveWeeklyReport error:', error.message);
}

// ── Daily insights ───────────────────────────────────────────

export async function fetchDailyInsight(userId: string, date: string) {
    const { data, error } = await supabase
        .from('ai_daily_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

    if (error) return null;
    return data;
}

export async function saveDailyInsight(userId: string, date: string, text: string, type: string) {
    const { error } = await supabase
        .from('ai_daily_insights')
        .upsert(
            { user_id: userId, date, insight_text: text, insight_type: type },
            { onConflict: 'user_id,date' },
        );

    if (error) console.warn('saveDailyInsight error:', error.message);
}
