export function getLocalDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getLocalDayBounds(dateKey: string): { startIso: string; endIso: string } {
    const [year, month, day] = dateKey.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function getRecentLocalDateKeys(days: number, endDate: Date = new Date()): string[] {
    return Array.from({ length: days }, (_, index) => {
        const date = new Date(endDate);
        date.setDate(endDate.getDate() - (days - 1 - index));
        return getLocalDateKey(date);
    });
}

export function getDayName(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(year, month - 1, day).getDay()];
}
