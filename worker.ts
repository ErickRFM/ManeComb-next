import { startCommunicationWorker } from "@/src/worker/communication-worker";
const worker = await startCommunicationWorker();
const shutdown = async () => { await worker?.close(); process.exit(0); };
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
