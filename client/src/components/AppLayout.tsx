import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell-main px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}


