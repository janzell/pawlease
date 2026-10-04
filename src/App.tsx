import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./state.tsx";
import { Layout } from "./components/Layout.tsx";
import { AuthPage } from "./pages/Auth.tsx";
import { HomePage } from "./pages/Home.tsx";
import { PetDetailPage, PetsPage } from "./pages/Pets.tsx";
import { TasksPage } from "./pages/Tasks.tsx";
import { BookingsPage } from "./pages/Bookings.tsx";
import { ProfessionalsPage } from "./pages/Professionals.tsx";
import { GuideDetailPage, GuidesPage } from "./pages/Guides.tsx";
import { FamilyPage, JoinPage } from "./pages/Family.tsx";
import { MorePage } from "./pages/More.tsx";

export function App() {
  const { me, loading } = useApp();

  if (loading) {
    return (
      <div className="loading" aria-label="Loading">
        🐾
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="/join/:code" element={<AuthPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/join/:code" element={<JoinPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="pets" element={<PetsPage />} />
        <Route path="pets/:id" element={<PetDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="pros" element={<ProfessionalsPage />} />
        <Route path="guides" element={<GuidesPage />} />
        <Route path="guides/:slug" element={<GuideDetailPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
