import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserStats } from '../local-store.js';
import type { DbProvider } from './db-interface.js';

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

  async loadUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await this.client
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      totalExp: data.total_exp,
      level: data.level,
      totalSessions: data.total_sessions,
      streakDays: data.streak_days,
      lastActiveDate: data.last_active_date,
      weeklyExpBonusClaimed: data.weekly_exp_bonus_claimed,
      updatedAt: data.updated_at,
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
}
