// filepath: apps/admin/app/layout.tsx
import "./globals.css";
import ApiProvider from "../lib/api-provider";
import { AdminAuthProvider } from "../hooks/useAdminAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </ApiProvider>
      </body>
    </html>
  );
}

