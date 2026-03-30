import type { TitlebarMenu } from '@/app/components/window/TitlebarMenu'

export const menuItems: TitlebarMenu[] = [
  {
    name: 'File',
    items: [
      {
        name: 'New Campaign',
        shortcut: 'Setup',
        actionCallback: () => {
          window.location.hash = '#/setup'
        },
      },
      {
        name: 'Settings',
        actionCallback: () => {
          window.location.hash = '#/settings'
        },
      },
      {
        name: '---',
      },
      {
        name: 'Reconnect Bridge',
        actionCallback: () => {
          window.conveyor.session.reconnect()
        },
      },
      {
        name: '---',
      },
      {
        name: 'Exit',
        action: 'window-close',
        shortcut: 'Alt+F4',
      },
    ],
  },
  {
    name: 'Navigate',
    items: [
      {
        name: 'Home',
        actionCallback: () => {
          window.location.hash = '#/'
        },
      },
      {
        name: 'Government',
        actionCallback: () => {
          window.location.hash = '#/strategic/government'
        },
      },
      {
        name: 'Fleet Command',
        actionCallback: () => {
          window.location.hash = '#/military/fleet'
        },
      },
      {
        name: 'Minerals',
        actionCallback: () => {
          window.location.hash = '#/economy/minerals'
        },
      },
      {
        name: 'Research',
        actionCallback: () => {
          window.location.hash = '#/science/research'
        },
      },
      {
        name: 'Settings',
        actionCallback: () => {
          window.location.hash = '#/system/settings'
        },
      },
    ],
  },
  {
    name: 'View',
    items: [
      {
        name: 'Zoom In',
        action: 'web-zoom-in',
        shortcut: 'Ctrl++',
      },
      {
        name: 'Zoom Out',
        action: 'web-zoom-out',
        shortcut: 'Ctrl+-',
      },
      {
        name: 'Reset Zoom',
        action: 'web-actual-size',
        shortcut: 'Ctrl+0',
      },
      {
        name: '---',
      },
      {
        name: 'Toggle Fullscreen',
        action: 'web-toggle-fullscreen',
        shortcut: 'F11',
      },
      {
        name: '---',
      },
      {
        name: 'Reload',
        action: 'web-reload',
        shortcut: 'Ctrl+R',
      },
      {
        name: 'Developer Tools',
        action: 'web-toggle-devtools',
        shortcut: 'Ctrl+Shift+I',
      },
    ],
  },
  {
    name: 'Window',
    items: [
      {
        name: 'Dark Mode',
        action: 'window-darkmode-toggle',
        shortcut: 'Toggle',
        actionCallback: () => {
          document.documentElement.classList.toggle('dark')
        },
      },
      {
        name: '---',
      },
      {
        name: 'Maximize',
        action: 'window-maximize-toggle',
      },
      {
        name: 'Minimize',
        action: 'window-minimize',
      },
      {
        name: 'Close',
        action: 'window-close',
      },
    ],
  },
  {
    name: 'Help',
    items: [
      {
        name: 'GitHub Repository',
        action: 'web-open-url',
        actionParams: ['https://github.com/ZionLG/aurora4x-advisor'],
        shortcut: '@ZionLG',
      },
      {
        name: 'Report Issue',
        action: 'web-open-url',
        actionParams: ['https://github.com/ZionLG/aurora4x-advisor/issues'],
      },
      {
        name: '---',
      },
      {
        name: 'About',
        actionCallback: () => {
          window.conveyor.app.version().then((v) => {
            alert(`Aurora 4X Companion v${v}`)
          })
        },
      },
    ],
  },
]
