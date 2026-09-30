import { beforeEach, expect, it, vi } from "vitest";
const fixture=vi.hoisted(()=>({send:vi.fn()}));
vi.mock("resend",()=>({Resend:class{emails={send:fixture.send}}}));
vi.mock("@/src/lib/env",()=>({getEnv:()=>({resendApiKey:"re_qa",emailFrom:"qa@example.invalid"})}));
import { sendTransactionalEmail } from "@/src/lib/email";
const email={to:"qa@example.invalid",subject:"QA",html:"<p>QA</p>"};
beforeEach(()=>fixture.send.mockReset());
it("rejects provider errors returned as data so the worker can retry",async()=>{
  fixture.send.mockResolvedValue({data:null,error:{name:"validation_error",message:"secret provider details"}});
  await expect(sendTransactionalEmail(email)).rejects.toThrow("EMAIL_PROVIDER_REJECTED");
});
it("uses the same provider key for repeated delivery attempts",async()=>{
  fixture.send.mockResolvedValue({data:{id:"email-qa"},error:null});
  await sendTransactionalEmail(email,{idempotencyKey:"outbox/qa"});
  await sendTransactionalEmail(email,{idempotencyKey:"outbox/qa"});
  expect(fixture.send).toHaveBeenNthCalledWith(1,expect.objectContaining(email),{idempotencyKey:"outbox/qa"});
  expect(fixture.send).toHaveBeenNthCalledWith(2,expect.objectContaining(email),{idempotencyKey:"outbox/qa"});
});
