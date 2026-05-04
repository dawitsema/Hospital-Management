export function emitNotificationsRefresh() {
  window.dispatchEvent(new CustomEvent("hospital:refresh-notifications"));
}
