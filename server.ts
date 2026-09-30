import { createServer } from "node:http";
import next from "next";
import { createRealtimeServer } from "@/src/realtime/socket-server";
import { startFreshnessSweeper } from "@/src/realtime/services/freshness-sweeper";
import { recordApiRequest } from "@/src/lib/metrics";
import { startRuntimeMetrics } from "@/src/lib/runtime-metrics";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

await app.prepare();
const httpServer = createServer((req, res) => {
  const started=Date.now();
  const api=String(req.url||"").startsWith("/api/");
  if(api)res.once("finish",()=>recordApiRequest(res.statusCode,Date.now()-started));
  handler(req,res);
});
const realtime = await createRealtimeServer(httpServer);
const stopRuntimeMetrics=startRuntimeMetrics();
const stopFreshnessSweeper=process.env.VISUAL_QA==="1"?()=>{}:startFreshnessSweeper(realtime);

httpServer.listen(port, hostname, () => {
  console.log("[manecomb] listening on http://" + hostname + ":" + port);
});

const shutdown = (signal: string) => {
  console.log("[manecomb] received " + signal);
  stopFreshnessSweeper();
  stopRuntimeMetrics();
  realtime.close();
  httpServer.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
