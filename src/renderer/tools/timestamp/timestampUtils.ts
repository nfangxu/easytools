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

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export function timestampToDate(input: string): TimestampToDateResult {
  const normalizedInput = input.trim();

  if (!/^\d{10}$/.test(normalizedInput) && !/^\d{13}$/.test(normalizedInput)) {
    return { ok: false, error: 'Timestamp must be exactly 10 seconds digits or 13 milliseconds digits' };
  }

  const milliseconds = normalizedInput.length === 10 ? Number(normalizedInput) * 1000 : Number(normalizedInput);
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Invalid timestamp' };
  }

  return { ok: true, value: formatLocalDate(date), milliseconds };
}

export function dateToTimestamp(input: string): DateToTimestampResult {
  const match = DATE_TIME_PATTERN.exec(input.trim());

  if (!match) {
    return { ok: false, error: 'Date must use YYYY-MM-DD HH:mm:ss format' };
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);

  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) {
    return { ok: false, error: 'Invalid date' };
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  const milliseconds = date.getTime();

  if (
    Number.isNaN(milliseconds) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return { ok: false, error: 'Invalid date' };
  }

  return {
    ok: true,
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
  };
}
