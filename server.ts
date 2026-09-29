import { createServer } from "node:http";
import next from "next";
import { createRealtimeServer } from "@/src/realtime/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

await app.prepare();
const httpServer = createServer((req, res) => handler(req, res));
const realtime = await createRealtimeServer(httpServer);

httpServer.listen(port, hostname, () => {
  console.log("[manecomb] listening on http://" + hostname + ":" + port);
});

const shutdown = (signal: string) => {
  console.log("[manecomb] received " + signal);
  realtime.close();
  httpServer.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
