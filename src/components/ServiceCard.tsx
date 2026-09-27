import { ArrowRightIcon, BoltIcon, WrenchIcon, HammerIcon, PaintBrushIcon, BroomIcon, TruckIcon, ChipIcon, HeartIcon } from './Icons'

const services = [
  { name: 'Electrician', Icon: BoltIcon, description: 'Fan, switch, wiring & light repairs', count: '2.4k+ bookings' },
  { name: 'Plumber', Icon: WrenchIcon, description: 'Tap, pipe, drain & bathroom plumbing', count: '1.8k+ bookings' },
  { name: 'Carpenter', Icon: HammerIcon, description: 'Door, furniture, lock & shelf work', count: '1.2k+ bookings' },
  { name: 'Painter', Icon: PaintBrushIcon, description: 'Wall, room & exterior painting', count: '980+ bookings' },
  { name: 'Cleaner', Icon: BroomIcon, description: 'Home, kitchen, bathroom & deep cleaning', count: '3.1k+ bookings' },
  { name: 'Driver', Icon: TruckIcon, description: 'Local, outstation & full-day driving', count: '890+ bookings' },
  { name: 'Caregiver', Icon: HeartIcon, description: 'Elder care, patient care & daily assistance', count: '720+ bookings' },
  { name: 'Technician', Icon: ChipIcon, description: 'AC, fridge, washing machine & TV repair', count: '1.5k+ bookings' },
]

interface ServiceCardProps {
  name: string
  Icon: React.FC<{ className?: string; style?: React.CSSProperties }>
  description: string
  count?: string
}

const ServiceCard = ({ name, Icon, description, count }: ServiceCardProps) => {
  return (
    <a
      href="#"
      className="group flex flex-col p-5 bg-white rounded-xl border transition-all duration-150"
      style={{borderColor: 'var(--color-border)'}}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-strong)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-150"
          style={{backgroundColor: 'var(--color-primary-tint)'}}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = '#ffffff'; const icon = e.currentTarget.querySelector('svg'); if (icon) icon.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-tint)'; const icon = e.currentTarget.querySelector('svg'); if (icon) icon.style.color = 'var(--color-primary)'; }}
        >
          <Icon className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
        </div>
        {count && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{backgroundColor: '#f1f5f9', color: '#475569'}}>
            {count}
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-[15px] font-semibold mb-1 leading-snug" style={{color: '#0f172a'}}>{name}</h3>
        <p className="text-sm leading-relaxed" style={{color: '#475569'}}>{description}</p>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between" style={{borderTop: '1px solid #f1f5f9'}}>
        <span className="text-xs" style={{color: '#94a3b8'}}>Starting from ₹199</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold transition-colors" style={{color: 'var(--color-primary)'}}>
          Book <ArrowRightIcon className="w-3 h-3" />
        </span>
      </div>
    </a>
  )
}

export { services, ServiceCard }