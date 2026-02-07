import { Outlet } from "react-router";
import { SiteHeader } from "./site-header";
import { BackgroundEffects } from "@/components/ui/background-effects";

export function RootLayout() {
  return (
    <>
      <BackgroundEffects />
      <div className="relative z-10 min-h-svh">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    </>
  );
}
