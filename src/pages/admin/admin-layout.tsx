import { useEffect } from "react";
import { Outlet, Link, useSearchParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/i18n/use-locale";
import { LogOut, LayoutDashboard, Github } from "lucide-react";

export function AdminLayout() {
  const { user, isAuthenticated, login, logout, setToken } = useAuth();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      navigate("/admin", { replace: true });
    }
  }, [searchParams, setToken, navigate]);

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
    </div>
  );
}
