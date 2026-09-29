function safeRoomSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "");
}

export function organizationRoom(organizationId: string) {
  return "org:" + safeRoomSegment(organizationId);
}

export function rtcRoom(organizationId: string) {
  return organizationRoom(organizationId) + ":rtc";
}

export function radioChannelRoom(organizationId: string, channelId: string) {
  return rtcRoom(organizationId) + ":radio:" + safeRoomSegment(channelId);
}

export function userRoom(userId: string) {
  return "user:" + safeRoomSegment(userId);
}
