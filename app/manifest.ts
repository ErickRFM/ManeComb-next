import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:"ManeComb Operación",
    short_name:"ManeComb",
    description:"Operación y telemetría de ManeComb",
    start_url:"/app",
    display:"standalone",
    background_color:"#09090b",
    theme_color:"#e11d48",
    icons:[]
  };
}
