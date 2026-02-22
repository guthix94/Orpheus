import "./globals.css";
import AuthGuard from "@/components/auth/AuthGuard";
import AppShellWrapper from "@/components/layout/AppShellWrapper";

export const metadata = {
  title: "Orpheus",
  description: "Intelligent lesson documentation for music educators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthGuard>
          <AppShellWrapper>{children}</AppShellWrapper>
        </AuthGuard>
      </body>
    </html>
  );
}
