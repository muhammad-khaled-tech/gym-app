// Session labels shared by the calendar and the week view.
export const SESSION_SHORT = {
  pushA: 'دفع A', pushB: 'دفع B', pullA: 'سحب A', pullB: 'سحب B', legsA: 'رجل A', legsB: 'رجل B', fullBody: 'فول بادي', rest: 'راحة',
};

export const sessionType = (k) => (k.startsWith('push') ? 'push' : k.startsWith('pull') ? 'pull' : k.startsWith('legs') ? 'legs' : k);

export function sessionTag(key) {
  return `<span class="s-tag t-${sessionType(key)}">${SESSION_SHORT[key] ?? ''}</span>`;
}
