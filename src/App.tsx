import { BrowserRouter, Routes, Route } from "react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { LandingPage } from "@/pages/landing";
import { AboutPage } from "@/pages/about";
import { DevlogPost } from "@/pages/devlogs/devlog-post";
import { NotFoundPage } from "@/pages/not-found";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="devlogs/:slug" element={<DevlogPost />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
