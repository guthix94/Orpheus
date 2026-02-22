import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata = {
  title: "Orpheus",
  description: "Intelligent lesson documentation for music educators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
