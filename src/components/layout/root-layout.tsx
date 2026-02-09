import { Outlet } from "react-router";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function RootLayout() {
  return (
    <>
      <div className="relative z-10 flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
