import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './lib/session';
import { Layout } from './components/Layout';
import { Spinner, ToastProvider } from './components/ui';
import { LoginPage, OnboardingPage, ResetPasswordPage, SetupPage } from './pages/Auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Inbox = lazy(() => import('./pages/Inbox'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Prospecting = lazy(() => import('./pages/Prospecting'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Clients = lazy(() => import('./pages/Clients'));
const Sales = lazy(() => import('./pages/Sales'));
const Services = lazy(() => import('./pages/Services'));
const Imports = lazy(() => import('./pages/Imports'));
const Reports = lazy(() => import('./pages/Reports'));
const Automations = lazy(() => import('./pages/Automations'));
const Team = lazy(() => import('./pages/Team'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Security = lazy(() => import('./pages/Security'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function Gate() {
  const app = useApp();
  if (app.mode === 'unconfigured') return <SetupPage />;
  if (!app.ready) return <div className="flex min-h-screen items-center justify-center bg-[#05070d]"><Spinner /></div>;
  if (location.hash.startsWith('#/redefinir-senha') && app.mode === 'supabase') return <ResetPasswordPage />;
  if (!app.userId) return <LoginPage />;
  if (app.needsOrg) return <OnboardingPage />;
  if (!app.org) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  return (
    <Layout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/funil" element={<Pipeline />} />
          <Route path="/caixa-de-entrada" element={<Inbox />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/prospeccao" element={<Prospecting />} />
          <Route path="/contatos-whatsapp" element={<Contacts />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/importacoes" element={<Imports />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/automacoes" element={<Automations />} />
          <Route path="/equipe" element={<Team />} />
          <Route path="/integracoes" element={<Integrations />} />
          <Route path="/seguranca" element={<Security />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter><Gate /></HashRouter>
      </AppProvider>
    </ToastProvider>
  );
}
