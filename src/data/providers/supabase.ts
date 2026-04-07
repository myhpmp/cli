import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserStats } from '../local-store.js';
import type { DbProvider, ExpHistoryEntry } from './db-interface.js';

export class SupabaseProvider implements DbProvider {
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async setSession(accessToken: string, refreshToken: string): Promise<void> {
    const { error } = await this.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error(`Failed to set session: ${error.message}`);
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return null;
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async loadUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await this.client
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    const totalExp = Number(data.total_exp) || 0;
    const level = Number(data.level) || 1;
    const totalSessions = Number(data.total_sessions) || 0;
    const streakDays = Number(data.streak_days) || 0;

    if (totalExp < 0 || level < 1 || totalSessions < 0 || streakDays < 0) {
      throw new Error('Invalid data from remote: negative values detected');
    }

    return {
      totalExp,
      level,
      totalSessions,
      streakDays,
      lastActiveDate: data.last_active_date ? String(data.last_active_date) : null,
      weeklyExpBonusClaimed: Boolean(data.weekly_exp_bonus_claimed),
      updatedAt: data.updated_at ? String(data.updated_at) : new Date().toISOString(),
    };
  }

  async saveUserStats(userId: string, stats: UserStats): Promise<void> {
    const { error } = await this.client
      .from('user_stats')
      .upsert({
        user_id: userId,
        total_exp: stats.totalExp,
        level: stats.level,
        total_sessions: stats.totalSessions,
        streak_days: stats.streakDays,
        last_active_date: stats.lastActiveDate,
        weekly_exp_bonus_claimed: stats.weeklyExpBonusClaimed,
        updated_at: stats.updatedAt,
      });

    if (error) throw new Error(`Supabase save failed: ${error.message}`);
  }

  async insertExpHistory(userId: string, entry: ExpHistoryEntry): Promise<void> {
    const { error } = await this.client
      .from('exp_history')
      .insert({
        user_id: userId,
        amount: entry.amount,
        reason: entry.reason,
      });

    if (error) throw new Error(`exp_history insert failed: ${error.message}`);
  }

}
