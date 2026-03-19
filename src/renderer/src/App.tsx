import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { GameProvider } from './contexts/game-provider'
import { AuroraDataProvider } from './contexts/aurora-data-context'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1
    }
  }
})

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <AuroraDataProvider>
          <RouterProvider router={router} />
        </AuroraDataProvider>
      </GameProvider>
    </QueryClientProvider>
  )
}

export default App
