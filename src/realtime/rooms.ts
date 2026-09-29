export function organizationRoom(organizationId: string) {
  return "org:" + organizationId;
}

export function rtcRoom(organizationId: string) {
  return "org:" + organizationId + ":rtc";
}

export function userRoom(userId: string) {
  return "user:" + userId;
}
