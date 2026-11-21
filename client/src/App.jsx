import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Issues = lazy(() => import('./pages/Issues'));
const Board = lazy(() => import('./pages/Board'));
const IssueDetail = lazy(() => import('./pages/IssueDetail'));
const Projects = lazy(() => import('./pages/Projects'));
const Team = lazy(() => import('./pages/Team'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Boot = () => (
  <div className="boot"><Spinner /></div>
);

function Private({ children, roles }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Boot />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <Boot />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Suspense fallback={<Boot />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Auth mode="register" /></GuestOnly>} />
      <Route element={<Private><Layout /></Private>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/board" element={<Board />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/team" element={<Private roles={['admin']}><Team /></Private>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
