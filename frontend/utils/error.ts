export function formatApiError(err: any, fallbackMsg: string = 'An error occurred'): string {
  if (!err) return fallbackMsg;

  const detail = err.response?.data?.detail;

  if (!detail) {
    if (err.message === 'Network Error') {
      return 'Backend Server Disconnected (http://localhost:8000). Please check that your FastAPI backend is running.';
    }
    if (typeof err.message === 'string') return err.message;
    return fallbackMsg;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ type, loc, msg, input }]
    const messages = detail.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.msg) {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
        return field ? `${field}: ${item.msg}` : item.msg;
      }
      return JSON.stringify(item);
    });
    return messages.join(', ');
  }

  if (typeof detail === 'object') {
    if (detail.msg) return detail.msg;
    return JSON.stringify(detail);
  }

  return fallbackMsg;
}
