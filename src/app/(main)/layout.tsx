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
      <main className="ml-[72px] pt-[62px]">{children}</main>
    </div>
  );
}
