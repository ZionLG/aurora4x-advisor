import { useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTabStore, type AppTab } from '@/app/stores/tab-store'
import { MODULES } from '@/app/modules/registry'
import { X } from 'lucide-react'

function SortableTab({
  tab,
  isActive,
  onActivate,
  onClose,
  onMiddleClick,
}: {
  tab: AppTab
  isActive: boolean
  onActivate: () => void
  onClose: (e: React.MouseEvent) => void
  onMiddleClick: (e: React.MouseEvent) => void
}) {
  const mod = MODULES.find((m) => m.id === tab.id)
  const Icon = mod?.icon

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      onMouseDown={onMiddleClick}
      className={`
        group flex max-w-[180px] min-w-[100px] cursor-pointer items-center
        gap-1.5 border-b-2 px-3 py-1.5 transition-colors select-none
        ${
          isActive
            ? `border-(--cic-cyan) bg-(--cic-void) text-(--cic-cyan)`
            : `
              border-transparent text-muted-foreground/60
              hover:bg-(--cic-void)/50 hover:text-foreground/70
            `
        }
        ${isDragging ? 'rounded-t shadow-lg' : ''}
      `}
    >
      {Icon && <Icon className="size-3 shrink-0" />}
      <span className="flex-1 truncate text-[10px]">{tab.name}</span>
      <button
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        className={`
          shrink-0 rounded-sm p-0.5 transition-colors
          ${
            isActive
              ? `
                text-(--cic-cyan)/50
                hover:bg-(--cic-cyan-glow) hover:text-(--cic-cyan)
              `
              : `
                text-muted-foreground/40 opacity-0
                group-hover:opacity-100
                hover:bg-(--cic-panel-edge) hover:text-foreground/60
              `
          }
        `}
      >
        <X className="size-2.5" />
      </button>
    </div>
  )
}

export function TabBar() {
  const navigate = useNavigate()
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const reorderTabs = useTabStore((s) => s.reorderTabs)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px drag threshold to distinguish from clicks
    })
  )

  if (tabs.length === 0) return null

  const handleActivate = (tab: AppTab) => {
    setActiveTab(tab.id)
    navigate(tab.route)
  }

  const handleClose = (e: React.MouseEvent, tab: AppTab) => {
    e.stopPropagation()
    const currentTabs = useTabStore.getState().tabs
    const currentActive = useTabStore.getState().activeTabId

    closeTab(tab.id)

    const remaining = currentTabs.filter((t) => t.id !== tab.id)
    if (remaining.length > 0 && currentActive === tab.id) {
      const idx = currentTabs.findIndex((t) => t.id === tab.id)
      const nextTab = remaining[Math.min(idx, remaining.length - 1)]
      navigate(nextTab.route)
    } else if (remaining.length === 0) {
      navigate('/')
    }
  }

  const handleMiddleClick = (e: React.MouseEvent, tab: AppTab) => {
    if (e.button === 1) {
      handleClose(e, tab)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, activatorEvent, delta } = event

    // Check if dropped outside the window — must check BEFORE `over`,
    // because closestCenter always returns a match even when pointer is outside
    const mouseEvent = activatorEvent as MouseEvent
    if (mouseEvent) {
      const dropX = mouseEvent.clientX + (delta?.x ?? 0)
      const dropY = mouseEvent.clientY + (delta?.y ?? 0)

      const isOutside = dropX < 0 || dropX > window.innerWidth || dropY < 0 || dropY > window.innerHeight

      if (isOutside) {
        const tab = tabs.find((t) => t.id === active.id)
        if (tab) {
          const screenX = mouseEvent.screenX + (delta?.x ?? 0)
          const screenY = mouseEvent.screenY + (delta?.y ?? 0)

          window.conveyor.window.windowPopout(tab.id, tab.route, screenX, screenY, tab.name)

          closeTab(tab.id)
          const remaining = tabs.filter((t) => t.id !== tab.id)
          if (remaining.length === 0) navigate('/')
        }
        return
      }
    }

    // Normal reorder
    if (!over || active.id === over.id) return

    const fromIndex = tabs.findIndex((t) => t.id === active.id)
    const toIndex = tabs.findIndex((t) => t.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderTabs(fromIndex, toIndex)
    }
  }

  return (
    <div
      className="
        flex shrink-0 items-end overflow-x-auto border-b
        border-(--cic-panel-edge) bg-(--cic-panel) px-1
      "
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => handleActivate(tab)}
              onClose={(e) => handleClose(e, tab)}
              onMiddleClick={(e) => handleMiddleClick(e, tab)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
