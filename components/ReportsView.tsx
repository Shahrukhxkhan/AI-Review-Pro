import React, { useState, useEffect } from 'react';
import { Report } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { generateReport } from '@/lib/reports';
import { useUser } from '@/hooks/useUser';
import { FileText, Plus } from 'lucide-react';

export default function ReportsView() {
  const { user } = useUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    // In a real app, I'd fetch filtered reviews here
    const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id);
        
    await generateReport(user.id, reviews || [], type);
    await fetchReports();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Reports</h2>
        <div className="flex gap-2">
          <button onClick={() => handleGenerateReport('weekly')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Generate Weekly
          </button>
          <button onClick={() => handleGenerateReport('monthly')} className="bg-indigo-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> Generate Monthly
          </button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between">
              <h3 className="font-bold capitalize">{report.type} Report</h3>
              <span className="text-sm text-slate-400">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <p>Reviews: {report.reviews_completed}</p>
            <p>Avg Score: {report.average_score.toFixed(2)}</p>
            <p>Most Common Issue: {report.most_common_issue}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
