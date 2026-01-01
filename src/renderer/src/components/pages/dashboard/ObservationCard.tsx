import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { AlertCircle } from 'lucide-react'

interface Observation {
  id: string
  data: Record<string, unknown>
  message?: string
}

interface ObservationCardProps {
  observation: Observation
}

export function ObservationCard({ observation }: ObservationCardProps): React.JSX.Element {
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">Observation</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">
            {observation.id}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{observation.message}</p>
      </CardContent>
    </Card>
  )
}
