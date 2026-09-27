import type { LucideIcon } from 'lucide-react'

// HUD panel: corner brackets, numbered monospace header, optional right slot
export default function HudPanel({
  index,
  title,
  icon: Icon,
  right,
  className = '',
  bodyClassName = '',
  children,
}: {
  index: string
  title: string
  icon?: LucideIcon
  right?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={`hud-panel flex flex-col ${className}`}>
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#00AEEF]/10">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#5eeaff] flex-shrink-0" />}
          <h2 className="font-hud text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9fdcf5] truncate">
            <span className="text-[#00AEEF]/60">{index} //</span> {title}
          </h2>
        </div>
        {right}
      </header>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
