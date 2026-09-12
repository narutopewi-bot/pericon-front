import React from 'react';

export type AnnouncementType = 
  | 'tumba' 
  | 'dame_tres' 
  | 'quiero_seis' 
  | 'van_nueve' 
  | 'acepto' 
  | 'no_quiero' 
  | 'win_round' 
  | 'opp_win_round' 
  | 'la_cogia'
  | 'pelao';

export interface AnnouncementData {
  type: AnnouncementType;
  title: string;
  subtitle?: string;
  badge?: string;
}

interface GameAnnouncementProps {
  announcement: AnnouncementData | null;
}

export const GameAnnouncement: React.FC<GameAnnouncementProps> = ({ announcement }) => {
  if (!announcement) return null;

  const getStyle = (type: AnnouncementType) => {
    switch (type) {
      case 'tumba':
        return {
          bg: 'bg-gradient-to-r from-red-900 via-amber-700 to-red-900',
          border: 'border-yellow-400',
          shadow: 'shadow-[0_0_40px_rgba(234,179,8,0.7)]',
          textColor: 'text-yellow-200',
          icon: '🔥'
        };
      case 'dame_tres':
      case 'quiero_seis':
      case 'van_nueve':
        return {
          bg: 'bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700',
          border: 'border-yellow-300',
          shadow: 'shadow-[0_0_35px_rgba(245,158,11,0.7)]',
          textColor: 'text-white',
          icon: '⚔️'
        };
      case 'acepto':
        return {
          bg: 'bg-gradient-to-r from-emerald-800 via-green-600 to-emerald-800',
          border: 'border-emerald-300',
          shadow: 'shadow-[0_0_35px_rgba(34,197,94,0.7)]',
          textColor: 'text-white',
          icon: '✅'
        };
      case 'no_quiero':
        return {
          bg: 'bg-gradient-to-r from-rose-900 via-red-700 to-rose-900',
          border: 'border-rose-400',
          shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.7)]',
          textColor: 'text-white',
          icon: '✋'
        };
      case 'win_round':
        return {
          bg: 'bg-gradient-to-r from-yellow-700 via-amber-500 to-yellow-700',
          border: 'border-yellow-200',
          shadow: 'shadow-[0_0_45px_rgba(250,204,21,0.8)]',
          textColor: 'text-black',
          icon: '🏆'
        };
      case 'opp_win_round':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-neutral-800 to-slate-900',
          border: 'border-neutral-500',
          shadow: 'shadow-[0_0_25px_rgba(0,0,0,0.8)]',
          textColor: 'text-neutral-200',
          icon: '🤖'
        };
      case 'la_cogia':
        return {
          bg: 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600',
          border: 'border-yellow-100',
          shadow: 'shadow-[0_0_50px_rgba(255,215,0,0.9)]',
          textColor: 'text-black',
          icon: '⭐'
        };
      case 'pelao':
        return {
          bg: 'bg-gradient-to-r from-red-950 via-amber-800 to-red-950',
          border: 'border-yellow-400',
          shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.85)]',
          textColor: 'text-yellow-100',
          icon: '⚡'
        };
      default:
        return {
          bg: 'bg-yellow-800',
          border: 'border-yellow-400',
          shadow: 'shadow-xl',
          textColor: 'text-white',
          icon: '📢'
        };
    }
  };

  const style = getStyle(announcement.type);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
      <div 
        className={`
          ${style.bg} ${style.border} ${style.shadow}
          border-4 rounded-3xl px-8 py-5 text-center
          transform transition-all duration-300 scale-100 animate-bounce
          max-w-md w-full backdrop-blur-sm
        `}
      >
        <div className="text-4xl mb-1">{style.icon}</div>
        <div className={`${style.textColor} font-black text-2xl md:text-3xl tracking-wider uppercase drop-shadow-md`}>
          {announcement.title}
        </div>
        {announcement.subtitle && (
          <div className="text-white/90 font-bold text-sm md:text-base mt-1 drop-shadow">
            {announcement.subtitle}
          </div>
        )}
        {announcement.badge && (
          <div className="mt-2 inline-block bg-black/40 text-yellow-300 font-extrabold text-xs px-3 py-1 rounded-full border border-yellow-300/40">
            {announcement.badge}
          </div>
        )}
      </div>
    </div>
  );
};
