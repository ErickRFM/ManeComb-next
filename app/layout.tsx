import type { Metadata } from "next";
import "@/app/globals.css";
import { PwaRegistration } from "@/src/components/pwa-registration";

export const metadata: Metadata = {
  title:{default:"ManeComb",template:"%s · ManeComb"},
  description:"Operación, monitoreo y comunicación para flotillas de transporte colectivo."
};

const themeScript=`(()=>{try{const saved=localStorage.getItem("manecomb.theme");const system=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=saved||system}catch{document.documentElement.dataset.theme="dark"}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body><a className="skip-link" href="#main-content">Saltar al contenido</a><PwaRegistration />{children}</body></html>;
}
