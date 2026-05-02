export const metadata = {
  title: "UNDERROOT — THE MODERN STANDARD FOR ACADEMIC WRITING",
  description:
    "Real-time collaborative research paper writing for distinguished scholars. AI-powered citation discovery and structural integrity analysis.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FCFBF7] text-[#1A2F23] selection:bg-[#B48E4D]/20 selection:text-[#1A2F23] m-0 p-0 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}