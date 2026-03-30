import { BrowserRouter, Routes, Route } from "react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { LandingPage } from "@/pages/landing";
import { AboutPage } from "@/pages/about";
import { DevlogPost } from "@/pages/devlogs/devlog-post";
import { NotFoundPage } from "@/pages/not-found";
import { LegalPage } from "@/pages/legal";
import { AuthCallback } from "@/pages/auth-callback";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { AdminDashboard } from "@/pages/admin/admin-dashboard";
import { AdminPostEditor } from "@/pages/admin/admin-post-editor";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="devlogs/:slug" element={<DevlogPost />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="posts/new" element={<AdminPostEditor />} />
            <Route path="posts/:slug/edit" element={<AdminPostEditor />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
