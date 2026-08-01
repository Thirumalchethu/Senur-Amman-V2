import "./globals.css";

export const metadata = {
  title: "Senur Amman Kovil Trust — Contributions",
  description: "Private, live contributions dashboard for trustees and volunteers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
