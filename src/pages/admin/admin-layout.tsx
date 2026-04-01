import { Outlet, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/i18n/use-locale";
import { LogOut, LayoutDashboard, Github, Loader2 } from "lucide-react";

export function AdminLayout() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-24">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-medium tracking-tight">
            {t("admin.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.loginSubtitle")}
          </p>
        </div>
        <button
          onClick={login}
          className="inline-flex items-center gap-2.5 rounded-lg bg-[#24292f] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#24292f]/90 dark:bg-white dark:text-[#24292f] dark:hover:bg-white/90"
        >
          <Github size={18} />
          {t("admin.loginButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <LayoutDashboard size={16} />
              {t("admin.dashboard")}
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.name || user.username}
              className="size-5 rounded-full ring-1 ring-border"
            />
          )}
          <span className="text-xs text-muted-foreground">
            {user?.name || user?.username}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={16} />
          </Button>
        </div>
      </div>
      <Outlet />
      <VersionInfo />
    </div>
  );
}

function VersionInfo() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/health");
      if (!res.ok) return null;
      return res.json() as Promise<{ version: string; commit: string }>;
    },
    staleTime: Infinity,
  });

  if (!data) return null;

  return (
    <p className="text-[10px] text-muted-foreground/50 text-right mt-4">
      v{data.version}
      {data.commit !== "dev" && (
        <span className="ml-1">({data.commit.slice(0, 7)})</span>
      )}
    </p>
  );
}
