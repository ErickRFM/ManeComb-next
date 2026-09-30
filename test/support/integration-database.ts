// Destructive fixtures may only use an explicitly named, disposable QA database.
export function requireIntegrationDatabase(uri: string | undefined) {
  const name = uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/(manecomb_(?:ci|qa_[A-Za-z0-9_]+))(?:\?|$)/)?.[1];
  if (!name) throw new Error("Integration tests require an explicit manecomb_ci or manecomb_qa_* database");
  return name;
}
