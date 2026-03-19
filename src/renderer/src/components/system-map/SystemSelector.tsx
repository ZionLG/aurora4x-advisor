import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/ui/select'
import { useMemorySystems } from '../../contexts/aurora-data-context'

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
  const { data: systems, isLoading } = useMemorySystems(gameId, raceId)

  if (!gameId) {
    return <div className="text-sm text-muted-foreground">Select a game first</div>
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
        {systems
          ?.sort((a, b) => a.Name.localeCompare(b.Name))
          .map((sys) => (
            <SelectItem key={sys.SystemID} value={sys.SystemID.toString()}>
              {sys.Name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
