export function StatusBadge({ status }) {
  const styles = {
    'Open': 'bg-amber-50 text-amber-700 border border-amber-100',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-100',
    'Resolved': 'bg-leaf-50 text-leaf-700 border border-leaf-100',
    'Closed': 'bg-ink-100 text-ink-600 border border-ink-200',
  };
  return <span className={`badge ${styles[status] || styles['Open']}`}>{status}</span>;
}

export function PriorityBadge({ priority }) {
  const styles = {
    'Critical': 'bg-red-50 text-red-700 border border-red-100',
    'High': 'bg-orange-50 text-orange-700 border border-orange-100',
    'Medium': 'bg-amber-50 text-amber-700 border border-amber-100',
    'Low': 'bg-ink-100 text-ink-600 border border-ink-200',
  };
  return <span className={`badge ${styles[priority] || styles['Medium']}`}>{priority}</span>;
}

export function CategoryBadge({ category }) {
  return <span className="badge bg-ink-50 text-ink-700 border border-ink-100">{category}</span>;
}
