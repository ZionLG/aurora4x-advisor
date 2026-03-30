import React from 'react'
import ReactDOM from 'react-dom/client'
import icon from '@/resources/build/icon.png?asset'
import { WindowContextProvider, menuItems } from '@/app/components/window'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './app'
import { PopoutShell } from './components/layout/PopoutShell'

// Check if this is a pop-out window
const params = new URLSearchParams(window.location.search)
const isPopout = params.get('mode') === 'popout'
const popoutModuleId = params.get('module')

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isPopout && popoutModuleId ? (
        <PopoutShell moduleId={popoutModuleId} />
      ) : (
        <WindowContextProvider titlebar={{ title: 'Aurora 4X Companion', icon, menuItems }}>
          <App />
        </WindowContextProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
