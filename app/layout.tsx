import type { Metadata } from "next";
import "@/app/globals.css";
import { PwaRegistration } from "@/src/components/pwa-registration";
export const metadata: Metadata = { title:{default:"ManeComb",template:"%s · ManeComb"}, description:"Operación, monitoreo y comunicación para flotillas de transporte colectivo." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><PwaRegistration />{children}</body></html>;
}
