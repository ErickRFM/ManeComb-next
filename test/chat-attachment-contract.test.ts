import { expect,it } from "vitest";
import { ChatMessageSchema } from "@/src/core/contracts/realtime";
const attachment={url:"https://res.cloudinary.com/qa/image/authenticated/v1/manecomb/tenant/chat/photo.jpg",publicId:"manecomb/tenant/chat/photo",resourceType:"image",bytes:1024,mimeType:"image/jpeg",fileName:"photo.jpg"};
const input={channelId:"dispatch",clientMessageId:"image-123",kind:"image" as const,body:""};
it("requires managed metadata for new image messages",()=>{
  expect(ChatMessageSchema.safeParse({...input,body:attachment.url}).success).toBe(false);
  expect(ChatMessageSchema.safeParse({...input,attachment}).success).toBe(true);
});
it("rejects hidden attachments on text and oversized/non-image files",()=>{
  expect(ChatMessageSchema.safeParse({...input,kind:"text",body:"hello",attachment}).success).toBe(false);
  expect(ChatMessageSchema.safeParse({...input,attachment:{...attachment,bytes:9*1024*1024}}).success).toBe(false);
  expect(ChatMessageSchema.safeParse({...input,attachment:{...attachment,mimeType:"application/pdf"}}).success).toBe(false);
});
