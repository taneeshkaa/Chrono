import GlobalNav from "@/components/layout/GlobalNav";
import Sidebar from "@/components/layout/Sidebar";
import { Suspense } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      <GlobalNav />
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="w-16 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900" />
        }>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
