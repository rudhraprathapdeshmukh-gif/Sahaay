import * as Lucide from 'lucide-react';

export const SearchIcon = Lucide.Search;
export const MenuIcon = Lucide.Menu;
export const CloseIcon = Lucide.X;
export const XMarkIcon = Lucide.X;
export const ChevronRightIcon = Lucide.ChevronRight;
export const CheckCircleIcon = Lucide.CheckCircle;
export const ShieldCheckIcon = Lucide.ShieldCheck;
export const StarIcon = Lucide.Star;
export const UsersIcon = Lucide.Users;
export const ClockIcon = Lucide.Clock;
export const LocationIcon = Lucide.MapPin;
export const SparkleIcon = Lucide.Sparkles;
export const ArrowRightIcon = Lucide.ArrowRight;
export const ArrowLeftIcon = Lucide.ArrowLeft;
export const BoltIcon = Lucide.Zap;
export const WrenchIcon = Lucide.Wrench;
export const PaintBrushIcon = Lucide.Paintbrush;
export const TruckIcon = Lucide.Truck;
export const BroomIcon = Lucide.Brush;
export const ChipIcon = Lucide.Cpu;
export const HammerIcon = Lucide.Hammer;
export const DropletIcon = Lucide.Droplet;
export const HeartIcon = Lucide.Heart;
export const PhoneIcon = Lucide.Phone;
export const HomeIcon = Lucide.Home;
export const BellIcon = Lucide.Bell;
export const UserIcon = Lucide.User;
export const ChartBarIcon = Lucide.BarChart2;
export const CalendarIcon = Lucide.Calendar;
export const CurrencyRupeeIcon = Lucide.IndianRupee;
export const ClipboardListIcon = Lucide.ClipboardList;
export const UserGroupIcon = Lucide.Users;
export const BookOpenIcon = Lucide.BookOpen;
export const CogIcon = Lucide.Settings;
export const AlertCircleIcon = Lucide.AlertCircle;
export const ShieldIcon = Lucide.Shield;
export const LockIcon = Lucide.Lock;
export const ClipboardIcon = Lucide.Clipboard;
export const ChatBubbleIcon = Lucide.MessageSquare;
export const TrendingUpIcon = Lucide.TrendingUp;
export const HelpCircleIcon = Lucide.HelpCircle;
export const MailIcon = Lucide.Mail;
export const TrashIcon = Lucide.Trash2;
export const SendIcon = Lucide.Send;
export const EyeIcon = Lucide.Eye;
export const ExternalLinkIcon = Lucide.ExternalLink;
export const NavigationIcon = Lucide.Navigation2;

/**
 * Sahaay brand logo — a helping hand symbol representing local services and community support.
 */
export const SahaayLogo = ({ size = 36, bg = '#0E7490' }: { size?: number; bg?: string }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'white',
        fontWeight: '800',
        fontSize: Math.round(size * 0.5),
      }}
    >
      S
    </div>
  )
}
