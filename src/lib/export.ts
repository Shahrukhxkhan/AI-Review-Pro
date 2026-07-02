import { CodeReview } from '../types';
import { jsPDF } from 'jspdf';

export const exportToJson = (data: CodeReview | CodeReview[], filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToMarkdown = (data: CodeReview | CodeReview[], filename: string) => {
  const reviews = Array.isArray(data) ? data : [data];
  let md = '# Code Reviews\n\n';
  reviews.forEach(r => {
    md += `## Review ID: ${r.id}\n`;
    md += `- Language: ${r.language}\n`;
    md += `- Overall Score: ${r.overall_score}\n\n`;
    md += `### Summary\n${r.feedback.summary}\n\n`;
    md += `### Code Snippet\n\`\`\`${r.language}\n${r.code_snippet}\n\`\`\`\n\n`;
    md += '---\n\n';
  });
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPdf = (data: CodeReview | CodeReview[], filename: string) => {
  const reviews = Array.isArray(data) ? data : [data];
  const doc = new jsPDF();
  
  reviews.forEach((r, i) => {
    if (i > 0) doc.addPage();
    doc.setFontSize(16);
    doc.text(`Review ID: ${r.id}`, 10, 10);
    doc.setFontSize(12);
    doc.text(`Language: ${r.language}`, 10, 20);
    doc.text(`Overall Score: ${r.overall_score}`, 10, 30);
    doc.text(`Summary:`, 10, 40);
    // Simple wrapping for summary
    const splitSummary = doc.splitTextToSize(r.feedback.summary, 180);
    doc.text(splitSummary, 10, 50);
  });
  
  doc.save(`${filename}.pdf`);
};
