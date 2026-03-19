import React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BridgeStatus } from '@shared/types'

export function BridgeStatusIndicator(): React.JSX.Element {
  const { data: status } = useQuery<BridgeStatus>({
    queryKey: ['bridgeStatus'],
    queryFn: () => window.api.bridge.getStatus(),
    refetchInterval: 3000
  })

  const isConnected = status?.isConnected ?? false

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-muted-foreground">
        {isConnected ? 'Bridge connected' : status?.lastError || 'Bridge disconnected'}
      </span>
    </div>
  )
}
