export const metadata = {
  title: "Orpheus",
  description: "Intelligent lesson documentation for music educators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
