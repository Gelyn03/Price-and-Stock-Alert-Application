// src/utils/formatTime.js
export const toPhTime = (raw, options = {}) => {
  if (!raw) return '—';
  const date = new Date(raw);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    ...options,
  }).format(date);
};

export const toPhDateTime = (raw) => toPhTime(raw, {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

export const toPhTimeOnly = (raw) => toPhTime(raw, {
  hour: '2-digit', minute: '2-digit', hour12: false,
});

export const toPhDateOnly = (raw) => toPhTime(raw, {
  year: 'numeric', month: '2-digit', day: '2-digit',
});