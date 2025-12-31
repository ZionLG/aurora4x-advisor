import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { WelcomeScreen } from './components/welcome/WelcomeScreen'
import { SetupWizard } from './components/setup/SetupWizard'
import { DashboardLayout, DashboardOverview } from './components/pages/dashboard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <WelcomeScreen />
      },
      {
        path: 'setup',
        element: <SetupWizard />
      },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardOverview />
          }
          // Future phase routes:
          // { path: 'phase-0', element: <Phase0View /> }
          // { path: 'phase-1', element: <Phase1View /> }
          // etc.
        ]
      }
    ]
  }
])
