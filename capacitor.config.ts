import type { CapacitorConfig } from "@capacitor/cli";
import {nativeServerTarget} from "./src/lib/native-server-url";

const serverTarget=nativeServerTarget(process.env.CAPACITOR_SERVER_URL);

const config:CapacitorConfig={
  appId:"com.manecomb.app",
  appName:"ManeComb",
  webDir:"public",
  server:serverTarget?{
    url:serverTarget.url,
    appStartPath:serverTarget.appStartPath,
    errorPath:"native-error.html",
    cleartext:serverTarget.url.startsWith("http://")
  }:{
    errorPath:"native-error.html"
  },
  android:{allowMixedContent:false}
};

export default config;
