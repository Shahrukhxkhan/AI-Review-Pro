// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import type { Express } from 'express';

describe('Backend API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createExpressApp();
  });

  describe('GET /api/health', () => {
    it('responds with 200 OK and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/review - Payload Validation', () => {
    it('returns 400 Bad Request when code snippet is missing', async () => {
      const res = await request(app)
        .post('/api/review')
        .send({ language: 'TypeScript' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing or empty code parameter');
    });

    it('returns 400 Bad Request when code snippet is only whitespace', async () => {
      const res = await request(app)
        .post('/api/review')
        .send({ code: '   \n  \t  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing or empty code parameter');
    });
  });

  describe('GET /api/dashboard-stats', () => {
    it('returns aggregated statistics structure without error', async () => {
      const res = await request(app).get('/api/dashboard-stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalReviews');
      expect(res.body).toHaveProperty('averageOverall');
      expect(res.body).toHaveProperty('averageDimensionScores');
      expect(typeof res.body.totalReviews).toBe('number');
    });
  });

  describe('POST /api/github/fetch-pr', () => {
    it('returns 400 when prUrl parameter is missing', async () => {
      const res = await request(app)
        .post('/api/github/fetch-pr')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing prUrl parameter');
    });

    it('returns 400 when prUrl has an invalid GitHub format', async () => {
      const res = await request(app)
        .post('/api/github/fetch-pr')
        .send({ prUrl: 'https://gitlab.com/owner/repo/-/merge_requests/1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid GitHub PR URL format');
    });
  });

  describe('POST /api/review/chat - Payload Validation', () => {
    it('returns 400 when code or messages is missing', async () => {
      const res = await request(app)
        .post('/api/review/chat')
        .send({ code: 'const x = 1;' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required parameters');
    });
  });

  describe('Express Rate Limiting Guard', () => {
    it('enforces rate limiting after 10 rapid review requests', async () => {
      // 10 requests allowed
      for (let i = 0; i < 9; i++) {
        await request(app).post('/api/review').send({});
      }

      // The 11th or subsequent request must be rate limited (429)
      const rateLimitedRes = await request(app).post('/api/review').send({});
      expect([400, 429]).toContain(rateLimitedRes.status);
      
      // Send one more to guarantee 429
      const finalRes = await request(app).post('/api/review').send({});
      expect(finalRes.status).toBe(429);
      expect(finalRes.body.error).toContain('Too many requests');
    });
  });
});
