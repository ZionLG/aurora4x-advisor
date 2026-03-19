import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/ui/select'
import { useSystems } from '../../hooks/use-system-map-data'

interface SystemSelectorProps {
  value: number | null
  onChange: (systemId: number) => void
  gameId: number | null
  raceId: number | null
}

export function SystemSelector({
  value,
  onChange,
  gameId,
  raceId
}: SystemSelectorProps): React.JSX.Element {
  const { data: systems, isLoading, error } = useSystems(gameId, raceId)

  if (!gameId) {
    return <div className="text-sm text-muted-foreground">Select a game first</div>
  }

  if (error) {
    return (
      <div className="text-sm text-red-400">Failed to load systems. Is the bridge connected?</div>
    )
  }

  return (
    <Select
      value={value?.toString() ?? ''}
      onValueChange={(v) => onChange(Number(v))}
      disabled={isLoading || !systems?.length}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder={isLoading ? 'Loading systems...' : 'Select a star system'} />
      </SelectTrigger>
      <SelectContent>
        {systems?.map((sys) => (
          <SelectItem key={sys.SystemID} value={sys.SystemID.toString()}>
            {sys.Name || `System ${sys.SystemID}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
