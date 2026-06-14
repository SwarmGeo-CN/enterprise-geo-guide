export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="SynSwarm Next.js integration example." />
      </head>
      <body>{children}</body>
    </html>
  );
}
