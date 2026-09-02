import { describe, it, expect, beforeEach } from 'vitest';
import { calculateStats, formatDate, truncate, saveToLocal, loadFromLocal, SEED_REVIEWS } from '@/lib/utils';
import { CodeReview } from '@/types';

describe('utils.ts - Analytics & Data Formatting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('calculateStats', () => {
    it('returns default zeroed metrics for empty reviews array', () => {
      const stats = calculateStats([]);
      expect(stats.totalReviews).toBe(0);
      expect(stats.averageOverall).toBe(0);
      expect(stats.averageDimensionScores.bugs).toBe(0);
      expect(stats.averageDimensionScores.security).toBe(0);
      expect(stats.languageDistribution).toHaveLength(0);
      expect(stats.scoreTrends).toHaveLength(0);
    });

    it('accurately computes averages, language counts, and trends for seed reviews', () => {
      const stats = calculateStats(SEED_REVIEWS);
      expect(stats.totalReviews).toBe(3);
      
      // Seed overall scores: 68, 32, 55 -> sum = 155 / 3 = 51.7
      expect(stats.averageOverall).toBe(51.7);
      
      // Dimension scores
      expect(stats.averageDimensionScores.bugs).toBe(Math.round((75 + 80 + 40) / 3)); // 65
      expect(stats.averageDimensionScores.security).toBe(Math.round((60 + 10 + 75) / 3)); // 48
      
      // Languages
      const languages = stats.languageDistribution.map(l => l.name);
      expect(languages).toContain('TypeScript');
      expect(languages).toContain('Python');
      expect(languages).toContain('Go');

      // Trends should be sorted by created_at ascending
      expect(stats.scoreTrends).toHaveLength(3);
      expect(stats.scoreTrends[0].date).toBe(formatDate('2026-06-15T14:30:00Z'));
    });
  });

  describe('formatDate', () => {
    it('formats ISO timestamps into human-readable format', () => {
      const formatted = formatDate('2026-06-20T15:45:00Z');
      expect(formatted).toContain('Jun');
      expect(formatted).toContain('2026');
    });
  });

  describe('truncate', () => {
    it('truncates strings longer than target length with ellipsis', () => {
      const longText = 'This is a very long code review feedback summary that needs truncating.';
      expect(truncate(longText, 20)).toBe('This is a very long ...');
    });

    it('returns exact string if length is within limit', () => {
      const shortText = 'Short text';
      expect(truncate(shortText, 20)).toBe('Short text');
    });
  });

  describe('localStorage helpers', () => {
    it('saves and loads structured JSON objects from local storage', () => {
      const sample = { score: 95, persona: 'security' };
      saveToLocal('test_item', sample);
      const retrieved = loadFromLocal('test_item', null);
      expect(retrieved).toEqual(sample);
    });

    it('returns default fallback value if key does not exist', () => {
      const fallback = { fallback: true };
      const res = loadFromLocal('non_existent_key', fallback);
      expect(res).toEqual(fallback);
    });
  });
});
