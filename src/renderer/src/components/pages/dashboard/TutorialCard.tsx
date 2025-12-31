import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card'
import { Badge } from '@components/ui/badge'

interface TutorialAdvice {
  id: string
  conditions: Record<string, unknown>
  body: string
}

interface TutorialCardProps {
  tutorial: TutorialAdvice
}

export function TutorialCard({ tutorial }: TutorialCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tutorial Advice</CardTitle>
          <Badge variant="secondary">{tutorial.id}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{tutorial.body}</p>
      </CardContent>
    </Card>
  )
}
