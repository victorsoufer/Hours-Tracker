/* Keeps the dashboard tied to the newest real entry, not to a demo date. */
window.filtered = function () {
  const records = Array.isArray(state.records) ? state.records : [];
  const valid = records.filter(record => record && record.date && Number.isFinite(new Date(`${record.date}T12:00`).getTime()));
  if (!valid.length) return [];

  const newest = valid.reduce((latest, record) => record.date > latest ? record.date : latest, valid[0].date);
  const end = new Date(`${newest}T23:59:59`);
  const start = new Date(end);

  if (state.period === 'day') start.setHours(0, 0, 0, 0);
  else if (state.period === 'week') start.setDate(start.getDate() - 6);
  else if (state.period === 'month') start.setDate(1);
  else start.setFullYear(1970, 0, 1);

  return valid.filter(record => {
    const date = new Date(`${record.date}T12:00`);
    return (state.filter === 'all' || record.workId === state.filter) && date >= start && date <= end;
  });
};

window.goalRecords = function () { return window.filtered(); };
render();
