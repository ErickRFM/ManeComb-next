import { expect, it } from "vitest";
import { requireIntegrationDatabase } from "./support/integration-database";
it.each([undefined,"mongodb://localhost/test","mongodb://localhost/manecomb","mongodb://localhost","mongodb://localhost/manecomb_ci_prod"])('rejects unsafe integration database %s', uri => {
  expect(() => requireIntegrationDatabase(uri)).toThrow("Integration tests require");
});
it.each(["mongodb://localhost/manecomb_ci","mongodb://user:password@h1,h2/manecomb_qa_run123?tls=true","mongodb+srv://user:password@localhost/manecomb_qa_run123"])('accepts explicit disposable database %s', uri => {
  expect(requireIntegrationDatabase(uri)).toMatch(/^manecomb_(ci|qa_)/);
});
