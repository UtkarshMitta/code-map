import { Routes, Route } from "react-router";
import HomePage from "./pages/home";
import DashboardPage from "./pages/dashboard";
import RepoViewerPage from "./pages/repo-viewer";

export default function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="repo/:owner/:repoName" element={<RepoViewerPage />} />
    </Routes>
  );
}
