import type { CapacitorConfig } from "@capacitor/cli";
import {nativeServerUrl} from "./src/lib/native-server-url";
const serverUrl=nativeServerUrl(process.env.CAPACITOR_SERVER_URL);
const config:CapacitorConfig={
  appId:"com.manecomb.app",
  appName:"ManeComb",
  webDir:"public",
  server:serverUrl?{url:serverUrl,cleartext:serverUrl.startsWith("http://")}:undefined,
  android:{allowMixedContent:false}
};
export default config;
