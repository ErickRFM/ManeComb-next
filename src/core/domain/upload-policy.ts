export type UploadKind="document"|"chat"|"payment"|"incident";
const documents={maxBytes:10*1024*1024,mimeTypes:["image/jpeg","image/png","image/webp","application/pdf"],formats:["jpg","jpeg","png","webp","pdf"]} as const;
export const UPLOAD_POLICY={
  document:documents,payment:documents,
  chat:{maxBytes:8*1024*1024,mimeTypes:["image/jpeg","image/png","image/webp"],formats:["jpg","jpeg","png","webp"]},
  incident:{maxBytes:25*1024*1024,mimeTypes:["image/jpeg","image/png","image/webp","video/mp4"],formats:["jpg","jpeg","png","webp","mp4"]}
} as const;
