import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  exportToJson, 
  exportToMarkdown, 
  exportToCsv, 
  exportToPdf, 
  exportReportToMarkdown, 
  exportReportToPdf 
} from '@/lib/export';
import { SEED_REVIEWS } from '@/lib/utils';

describe('export.ts - Document & Data Export Handlers', () => {
  let createdUrls: string[] = [];
  let clickedAnchors: HTMLAnchorElement[] = [];

  beforeEach(() => {
    createdUrls = [];
    clickedAnchors = [];

    // Mock createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:mock-url-${createdUrls.length + 1}`;
      createdUrls.push(url);
      return url;
    });

    window.URL.revokeObjectURL = vi.fn((url: string) => {
      createdUrls = createdUrls.filter(u => u !== url);
    });

    // Mock HTMLAnchorElement click
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedAnchors.push(this);
    });
  });

  describe('exportToJson', () => {
    it('generates a JSON blob and initiates download with .json extension', () => {
      exportToJson(SEED_REVIEWS[0], 'test-review');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('test-review.json');
      expect(clickedAnchors[0].href).toContain('blob:mock-url');
    });
  });

  describe('exportToMarkdown', () => {
    it('creates Markdown document and triggers download with .md extension', () => {
      exportToMarkdown(SEED_REVIEWS, 'all-reviews');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('all-reviews.md');
    });
  });

  describe('exportToCsv', () => {
    it('generates a CSV file with correct headers and rows', () => {
      exportToCsv(SEED_REVIEWS, 'reviews-export');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('reviews-export.csv');
    });
  });

  describe('exportToPdf', () => {
    it('instantiates jsPDF and saves file without error', () => {
      expect(() => exportToPdf(SEED_REVIEWS[0], 'audit-report')).not.toThrow();
    });
  });

  describe('exportReportToMarkdown', () => {
    it('formats executive performance reports in Markdown', () => {
      const mockReport = {
        id: 'rep-001',
        type: 'weekly',
        created_at: new Date().toISOString(),
        reviews_completed: 12,
        average_score: 84.5,
        most_common_issue: 'Missing Input Sanitization',
        improvement_percentage: 15.2
      };

      exportReportToMarkdown(mockReport, 'weekly-summary');
      expect(clickedAnchors).toHaveLength(1);
      expect(clickedAnchors[0].download).toBe('weekly-summary.md');
    });
  });

  describe('exportReportToPdf', () => {
    it('generates formatted PDF performance report', () => {
      const mockReport = {
        id: 'rep-002',
        type: 'monthly',
        created_at: new Date().toISOString(),
        reviews_completed: 45,
        average_score: 88.0,
        most_common_issue: 'Implicit any typing',
        improvement_percentage: 22.4
      };

      expect(() => exportReportToPdf(mockReport, 'monthly-summary')).not.toThrow();
    });
  });
});
