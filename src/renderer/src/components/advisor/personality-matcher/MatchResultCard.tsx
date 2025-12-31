import React from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import type { MatchResult } from '@shared/types'

interface MatchResultCardProps {
  result: MatchResult
  isSelected: boolean
  isPrimary?: boolean
  onClick: () => void
}

export function MatchResultCard({
  result,
  isSelected,
  isPrimary = false,
  onClick
}: MatchResultCardProps): React.JSX.Element {
  // Non-primary cards use compact inline style
  if (!isPrimary) {
    return (
      <div
        className={`
          flex items-center justify-between text-xs p-2.5 rounded-md border
          cursor-pointer transition-all duration-150 ease-in-out
          ${
            isSelected
              ? 'border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-400/40 shadow-sm'
              : 'border-gray-200 dark:border-gray-800 hover:border-blue-400/40 dark:hover:border-blue-500/30 hover:bg-gray-50/50 dark:hover:bg-gray-900/30'
          }
        `}
        onClick={onClick}
      >
        <span className="text-xs font-medium truncate flex-1 min-w-0 pr-3">
          {result.profileName}
        </span>
        <Badge
          variant={isSelected ? 'default' : 'outline'}
          className={`text-[10px] px-1.5 py-0 h-5 shrink-0 font-semibold ${
            isSelected
              ? 'bg-blue-500/90 hover:bg-blue-500 dark:bg-blue-600/80 dark:hover:bg-blue-600'
              : 'border-gray-300 dark:border-gray-700'
          }`}
        >
          {result.confidence}%
        </Badge>
      </div>
    )
  }

  // Primary card uses full card layout
  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 ease-in-out
        border-2
        ${
          isSelected
            ? 'border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-400/40 shadow-sm scale-[1.02]'
            : 'border-gray-200 dark:border-gray-800 hover:border-blue-400/40 dark:hover:border-blue-500/30 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 hover:shadow-sm'
        }
      `}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{result.profileName}</h3>
              <Badge className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-emerald-500/90 hover:bg-emerald-500 dark:bg-emerald-600/80 dark:hover:bg-emerald-600">
                Best Match
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              variant="default"
              className="text-xs px-2 py-0.5 font-semibold whitespace-nowrap bg-blue-500/90 hover:bg-blue-500 dark:bg-blue-600/80 dark:hover:bg-blue-600 shadow-sm"
            >
              {result.confidence}%
            </Badge>
            <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Confidence
            </span>
          </div>
        </div>

        {result.failedRules.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
              Weak areas:
            </p>
            <div className="flex flex-wrap gap-1">
              {result.failedRules.map((rule) => (
                <Badge
                  key={rule}
                  variant="destructive"
                  className="text-[10px] px-2 py-0.5 font-medium"
                >
                  {rule}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
