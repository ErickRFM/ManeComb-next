function safeIdSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function organizationRoom(organizationId: string) {
  return "org:" + safeIdSegment(organizationId);
}

export function rtcRoom(organizationId: string) {
  return organizationRoom(organizationId) + ":rtc";
}

export function radioChannelRoom(organizationId: string, channelId: string) {
  return rtcRoom(organizationId) + ":radio:" + encodeURIComponent(channelId);
}

export function userRoom(userId: string) {
  return "user:" + safeIdSegment(userId);
}
