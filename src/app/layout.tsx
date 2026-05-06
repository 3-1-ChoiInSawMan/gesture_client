import type { Metadata } from "next";
import ToastProvider from "@/components/common/ToastProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Gesture",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
