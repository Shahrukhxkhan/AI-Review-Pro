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

export const exportToCsv = (data: CodeReview | CodeReview[], filename: string) => {
  const reviews = Array.isArray(data) ? data : [data];
  const headers = ['ID', 'Language', 'Overall Score', 'Bug Score', 'Security Score', 'Readability Score', 'Complexity Score', 'Created At', 'Summary'];
  
  const csvRows = [headers.join(',')];
  
  reviews.forEach(r => {
    const row = [
      r.id,
      r.language,
      r.overall_score,
      r.bug_score,
      r.security_score,
      r.readability_score,
      r.complexity_score,
      r.created_at,
      `"${(r.feedback.summary || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportReportToMarkdown = (report: any, filename: string) => {
  let md = `# AI Review Pro - ${report.type.toUpperCase()} Performance Audit Report\n\n`;
  md += `- **Report ID**: ${report.id}\n`;
  md += `- **Generated Date**: ${new Date(report.created_at).toLocaleString()}\n`;
  md += `- **Audits Completed**: ${report.reviews_completed}\n`;
  md += `- **Average Quality Score**: ${Number(report.average_score).toFixed(1)} / 100\n`;
  md += `- **Most Common Defect**: ${report.most_common_issue || 'None'}\n`;
  md += `- **Improvement Differential**: ${report.improvement_percentage >= 0 ? '+' : ''}${Number(report.improvement_percentage || 0).toFixed(1)}%\n\n`;
  md += `---\n*Generated automatically by AI Review Pro*\n`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportReportToPdf = (report: any, filename: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`AI Review Pro - ${report.type.toUpperCase()} Report`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Report ID: ${report.id}`, 14, 28);
  doc.text(`Generated: ${new Date(report.created_at).toLocaleString()}`, 14, 34);
  
  doc.setDrawColor(200);
  doc.line(14, 40, 196, 40);
  
  doc.setTextColor(20);
  doc.setFontSize(12);
  doc.text(`Audits Completed: ${report.reviews_completed}`, 14, 52);
  doc.text(`Average Quality Score: ${Number(report.average_score).toFixed(1)} / 100`, 14, 62);
  doc.text(`Most Common Issue: ${report.most_common_issue || 'None'}`, 14, 72);
  doc.text(`Quality Improvement: ${report.improvement_percentage >= 0 ? '+' : ''}${Number(report.improvement_percentage || 0).toFixed(1)}%`, 14, 82);
  
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Confidential - AI Review Pro Intelligence Engine`, 14, 280);
  
  doc.save(`${filename}.pdf`);
};

