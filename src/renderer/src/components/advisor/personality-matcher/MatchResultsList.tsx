import React from 'react'
import { MatchResultCard } from './MatchResultCard'
import type { PersonalityMatch } from '@shared/types'

interface MatchResultsListProps {
  matchResult: PersonalityMatch
  selectedProfile: string | null
  onSelectProfile: (profileName: string) => void
}

export function MatchResultsList({
  matchResult,
  selectedProfile,
  onSelectProfile
}: MatchResultsListProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      {/* Primary Match */}
      <MatchResultCard
        result={matchResult.primary}
        isSelected={selectedProfile === matchResult.primary.profileName}
        isPrimary={true}
        onClick={() => onSelectProfile(matchResult.primary.profileName)}
      />

      {/* All Other Profiles - Show if there are more than just the primary */}
      {matchResult.allMatches.length > 1 && (
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground list-none uppercase tracking-wide px-1 hover:text-foreground transition-colors">
            <span className="flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform duration-200">▶</span>
              View All {matchResult.allMatches.length} Profiles
            </span>
          </summary>
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto px-1 scrollbar-thin">
            {matchResult.allMatches.map((match) => (
              <MatchResultCard
                key={match.profileId}
                result={match}
                isSelected={selectedProfile === match.profileName}
                isPrimary={false}
                onClick={() => onSelectProfile(match.profileName)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
