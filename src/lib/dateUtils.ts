
export const getDateRange = (period: string): { start: Date, end: Date } => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (period) {
    case 'This week':
      start = new Date(now);
      start.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    case 'Last week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'This month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    case 'Last month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'Last 3 months':
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
  }
  return { start, end };
};
