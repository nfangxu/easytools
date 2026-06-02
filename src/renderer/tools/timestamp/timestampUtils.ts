export type TimestampToDateResult =
  | { ok: true; value: string; milliseconds: number }
  | { ok: false; error: string };

export type DateToTimestampResult =
  | { ok: true; seconds: number; milliseconds: number }
  | { ok: false; error: string };

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());
  const seconds = padDatePart(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function timestampToDate(input: string): TimestampToDateResult {
  if (!/^\d{10}$/.test(input) && !/^\d{13}$/.test(input)) {
    return { ok: false, error: 'Timestamp must be exactly 10 seconds digits or 13 milliseconds digits' };
  }

  const milliseconds = input.length === 10 ? Number(input) * 1000 : Number(input);
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Invalid timestamp' };
  }

  return { ok: true, value: formatLocalDate(date), milliseconds };
}

export function dateToTimestamp(input: string): DateToTimestampResult {
  const date = new Date(input);
  const milliseconds = date.getTime();

  if (Number.isNaN(milliseconds)) {
    return { ok: false, error: 'Invalid date' };
  }

  return {
    ok: true,
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
  };
}
