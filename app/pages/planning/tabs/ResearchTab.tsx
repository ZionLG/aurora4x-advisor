import { useResearch } from '@/app/hooks/data'
import { Loader2, FlaskConical, CheckCircle, Clock } from 'lucide-react'

interface ResearchProject {
  projectId: number
  techName: string
  fieldName: string
  totalCost: number
  labs: number
  pointsRemaining: number
  percentComplete: number
  paused: boolean
  colony: string
}

interface TechCategory {
  id: number
  name: string
  total: number
  researched: number
}

interface ResearchOverview {
  projects: ResearchProject[]
  categories: TechCategory[]
}

export function ResearchTab() {
  const { data: research, isLoading } = useResearch()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--cic-cyan-dim)]" />
      </div>
    )
  }

  const data = research as ResearchOverview | undefined
  const projects = data?.projects ?? []
  const categories = data?.categories ?? []

  return (
    <div className="p-4 space-y-4">
      {/* Active projects */}
      {projects.length > 0 && (
        <div>
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-cyan-dim)] mb-2">
            Active Projects
          </h3>
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3 text-[var(--cic-cyan-dim)]" />
                    <span className="text-[10px] font-medium text-foreground/80">{project.techName}</span>
                    {project.paused && (
                      <span className="text-[7px] px-1 py-0.5 rounded bg-[var(--cic-amber-glow)] text-[var(--cic-amber)]">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[8px] font-mono text-muted-foreground">
                      {project.labs} labs · {project.colony}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--cic-void)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(project.percentComplete, 100)}%`,
                      background: project.percentComplete >= 100 ? 'var(--cic-green)' : 'var(--cic-cyan)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-muted-foreground">{project.fieldName}</span>
                  <span className="text-[8px] font-mono text-muted-foreground">
                    {project.percentComplete.toFixed(1)}% · {project.pointsRemaining.toLocaleString()} RP remaining
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories summary */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cic-amber-dim)] mb-2">
            Research Fields
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-md border border-[var(--cic-panel-edge)] bg-[var(--cic-panel)] px-3 py-2"
              >
                <span className="text-[9px] font-medium text-foreground/60">{cat.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-2.5 w-2.5 text-[var(--cic-green)]" />
                  <span className="text-[8px] font-mono text-muted-foreground">
                    {cat.researched}/{cat.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && categories.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-8">No research data available</p>
      )}
    </div>
  )
}
