export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white py-12 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-ink-300" />}
      <h3 className="font-serif text-lg font-medium text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-500">
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-leaf-600"></div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message, detail, onRetry }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {detail && <p className="mt-2 text-xs text-red-700">{detail}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-3 text-xs">
          Try again
        </button>
      )}
    </div>
  );
}
