import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewReviewView from '@/components/NewReviewView';

// Mock Monaco Editor for jsdom environment
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-mock-editor"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
    />
  ),
  DiffEditor: () => <div data-testid="monaco-mock-diff-editor" />
}));

describe('NewReviewView Component', () => {
  const mockAddReview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders title, persona buttons, and mode switcher', () => {
    render(<NewReviewView onAddReview={mockAddReview} />);

    expect(screen.getByText('New AI Code Review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Snippet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Git Diff \/ PR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Multi-File/i })).toBeInTheDocument();

    // Check persona buttons
    expect(screen.getByText('Balanced Generalist')).toBeInTheDocument();
    expect(screen.getByText('Security Auditor')).toBeInTheDocument();
    expect(screen.getByText('Performance Ninja')).toBeInTheDocument();
    expect(screen.getByText('Junior Mentor')).toBeInTheDocument();
  });

  it('switches to Git Diff / PR mode and shows PR fetcher bar', () => {
    render(<NewReviewView onAddReview={mockAddReview} />);

    const prModeButton = screen.getByRole('button', { name: /Git Diff \/ PR/i });
    fireEvent.click(prModeButton);

    expect(screen.getByText('Import Public GitHub Pull Request Diff')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. https://github.com/facebook/react/pull/28000')).toBeInTheDocument();
    expect(screen.getByText('Fetch Diff')).toBeInTheDocument();
  });

  it('switches to Multi-File mode and displays file list and upload trigger', () => {
    render(<NewReviewView onAddReview={mockAddReview} />);

    const multiFileButton = screen.getByRole('button', { name: /Multi-File/i });
    fireEvent.click(multiFileButton);

    expect(screen.getByText(/Connected Files in Workspace/i)).toBeInTheDocument();
    expect(screen.getByText('+ Add Files')).toBeInTheDocument();
    expect(screen.getByText('UserController.ts')).toBeInTheDocument();
    expect(screen.getByText('UserService.ts')).toBeInTheDocument();
  });

  it('allows switching audit personas', () => {
    render(<NewReviewView onAddReview={mockAddReview} />);

    const securityBtn = screen.getByText('Security Auditor');
    fireEvent.click(securityBtn);

    expect(screen.getByText(/Launch AI Review \(SECURITY\)/i)).toBeInTheDocument();
  });
});
