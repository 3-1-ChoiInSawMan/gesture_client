import { Header, SideBar } from "@/components";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <SideBar />
      <main className="ml-18 pt-15.5">{children}</main>
    </div>
  );
}
