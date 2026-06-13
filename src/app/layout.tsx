import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juntada",
  description: "Gastos compartidos sin drama",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="es">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
