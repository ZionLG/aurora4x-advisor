import React from 'react'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/ui/select'
import type { Archetype, ArchetypeId } from '@shared/types'

interface ArchetypeSelectorProps {
  archetypes: Archetype[]
  selectedArchetype: ArchetypeId
  selectedArchetypeInfo: Archetype | null
  onSelect: (archetype: ArchetypeId) => void
}

export function ArchetypeSelector({
  archetypes,
  selectedArchetype,
  selectedArchetypeInfo,
  onSelect
}: ArchetypeSelectorProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="archetype" className="text-xs">
        Leadership Archetype
      </Label>
      <Select value={selectedArchetype} onValueChange={(value) => onSelect(value as ArchetypeId)}>
        <SelectTrigger id="archetype" className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {archetypes.map((archetype) => (
            <SelectItem key={archetype.id} value={archetype.id}>
              {archetype.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedArchetypeInfo && (
        <p className="text-xs text-muted-foreground leading-tight">
          {selectedArchetypeInfo.description}
        </p>
      )}
    </div>
  )
}
