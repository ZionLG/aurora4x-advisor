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
        <Loader2 className="size-5 animate-spin text-(--cic-cyan-dim)" />
      </div>
    )
  }

  const data = research as ResearchOverview | undefined
  const projects = data?.projects ?? []
  const categories = data?.categories ?? []

  return (
    <div className="space-y-4 p-4">
      {/* Active projects */}
      {projects.length > 0 && (
        <div>
          <h3 className="
            mb-2 text-[9px] font-semibold tracking-wider text-(--cic-cyan-dim)
            uppercase
          ">
            Active Projects
          </h3>
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="
                  rounded-md border border-(--cic-panel-edge) bg-(--cic-panel)
                  p-3
                "
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="size-3 text-(--cic-cyan-dim)" />
                    <span className="text-[10px] font-medium text-foreground/80">{project.techName}</span>
                    {project.paused && (
                      <span className="
                        rounded-sm bg-(--cic-amber-glow) px-1 py-0.5 text-[7px]
                        text-(--cic-amber)
                      ">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-2.5 text-muted-foreground" />
                    <span className="font-mono text-[8px] text-muted-foreground">
                      {project.labs} labs · {project.colony}
                    </span>
                  </div>
                </div>
                <div className="
                  h-1.5 w-full overflow-hidden rounded-full bg-(--cic-void)
                ">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(project.percentComplete, 100)}%`,
                      background: project.percentComplete >= 100 ? 'var(--cic-green)' : 'var(--cic-cyan)',
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[8px] text-muted-foreground">{project.fieldName}</span>
                  <span className="font-mono text-[8px] text-muted-foreground">
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
          <h3 className="
            mb-2 text-[9px] font-semibold tracking-wider text-(--cic-amber-dim)
            uppercase
          ">
            Research Fields
          </h3>
          <div className="
            grid grid-cols-2 gap-2
            lg:grid-cols-3
          ">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="
                  rounded-md border border-(--cic-panel-edge) bg-(--cic-panel)
                  px-3 py-2
                "
              >
                <span className="text-[9px] font-medium text-foreground/60">{cat.name}</span>
                <div className="mt-0.5 flex items-center gap-1">
                  <CheckCircle className="size-2.5 text-(--cic-green)" />
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {cat.researched}/{cat.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && categories.length === 0 && (
        <p className="py-8 text-center text-[10px] text-muted-foreground">No research data available</p>
      )}
    </div>
  )
}
