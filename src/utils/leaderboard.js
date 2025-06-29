const LEADERBOARD_KEY = 'windyglider_leaderboard';
const MAX_ENTRIES = 10;

export function getLeaderboard() {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

export { MAX_ENTRIES }; 