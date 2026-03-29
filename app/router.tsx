import { createHashRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { WelcomePage } from './pages/welcome/WelcomePage'
import { SetupPage } from './pages/setup/SetupPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PlanningPage } from './pages/planning/PlanningPage'
import { GovernmentPage } from './pages/government/GovernmentPage'
import { SettingsPage } from './pages/settings/SettingsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'setup', element: <SetupPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'planning', element: <PlanningPage /> },
      { path: 'government', element: <GovernmentPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
