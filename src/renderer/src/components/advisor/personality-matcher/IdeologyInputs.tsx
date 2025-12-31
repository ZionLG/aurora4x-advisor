import React from 'react'
import { Label } from '@components/ui/label'
import { Input } from '@components/ui/input'
import type { IdeologyProfile } from '@shared/types'

const ideologyStats: Array<{
  key: keyof IdeologyProfile
  label: string
  min: number
  max: number
}> = [
  { key: 'xenophobia', label: 'Xenophobia', min: 1, max: 100 },
  { key: 'diplomacy', label: 'Diplomacy', min: 1, max: 100 },
  { key: 'militancy', label: 'Militancy', min: 1, max: 100 },
  { key: 'expansionism', label: 'Expansionism', min: 1, max: 100 },
  { key: 'determination', label: 'Determination', min: 1, max: 100 },
  { key: 'trade', label: 'Trade', min: 1, max: 100 }
]

interface IdeologyInputsProps {
  ideology: IdeologyProfile
  onChange: (key: keyof IdeologyProfile, value: string) => void
}

export function IdeologyInputs({ ideology, onChange }: IdeologyInputsProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium">Ideology Profile</h3>
      {ideologyStats.map(({ key, label, min, max }) => (
        <div key={key} className="flex items-center justify-between gap-2">
          <Label htmlFor={key} className="text-xs">
            {label}
          </Label>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground text-right w-6">{min}</span>
            <Input
              id={key}
              type="text"
              inputMode="numeric"
              value={ideology[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-14 h-6 text-xs text-center"
            />
            <span className="text-[10px] text-muted-foreground w-6">{max}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
