'use client';

import NotificationBell from '../NotificationBell';
import { formatBalance } from '../../lib/balance';
import { UserData } from '../../lib/api';

interface PersonalHeroSectionProps {
  userData: UserData | null;
  walletAddress: string;
  balance: number;
  streakInfo: any;
}

export default function PersonalHeroSection({ 
  userData, 
  walletAddress, 
  balance, 
  streakInfo 
}: PersonalHeroSectionProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: 'Late night', emoji: '🌙', vibe: "burning the midnight oil?" };
    if (hour < 12) return { text: 'Good morning', emoji: '☀️', vibe: "ready to make moves?" };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️', vibe: "let's get things done!" };
    if (hour < 21) return { text: 'Good evening', emoji: '🌅', vibe: "winding down?" };
    return { text: 'Good night', emoji: '🌃', vibe: "one more transaction?" };
  };

  const greeting = getGreeting();

  return (
    <div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[380px]">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a40] via-[#1a1030] to-[#0f0820]" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#7f13ec]/30 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#a855f7]/20 blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      <div className="absolute top-[20%] left-[30%] w-[200px] h-[200px] rounded-full bg-blue-500/10 blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      
      {/* Mesh Pattern Overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(127, 19, 236, 0.1) 0%, transparent 50%), 
                          radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`,
      }} />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full p-6 md:p-10 flex flex-col">
        {/* Top Row: Badge + Notification */}
        <div className="flex items-start justify-between mb-auto">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/80">Movement Network</span>
            </div>
            {streakInfo?.streak > 0 && (
              <div className="px-3 py-1.5 rounded-full bg-[#7f13ec]/20 backdrop-blur-sm border border-[#7f13ec]/30 flex items-center gap-2">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-[#7f13ec]">{streakInfo.streak} day streak</span>
              </div>
            )}
          </div>
          <div className="hidden lg:flex">
            <NotificationBell walletAddress={walletAddress} />
          </div>
        </div>

        {/* Main Greeting */}
        <div className="flex-1 flex flex-col justify-center overflow-visible">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{greeting.emoji}</span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
              {greeting.text},
            </h1>
          </div>
          <h2 
            className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent w-fit pr-2"
            style={{
              background: 'linear-gradient(to right, #ffffff, #e9d5ff, #a855f7)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {userData?.displayName || `@${userData?.username}`}
          </h2>
          <p className="text-[#ad92c9] text-lg mt-3 max-w-md">
            {greeting.vibe} {streakInfo?.transferCount > 0 
              ? `You've made ${streakInfo.transferCount} transfers so far!`
              : 'Ready to make your first move?'}
          </p>
        </div>

        {/* Bottom Stats Cards - Floating on Banner */}
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center">
              <span className="text-white text-lg">💰</span>
            </div>
            <div>
              <p className="text-[#ad92c9] text-xs">Balance</p>
              <p className="text-white font-bold">{formatBalance(balance)} MOVE</p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <p className="text-[#ad92c9] text-xs">Transfers</p>
              <p className="text-white font-bold">{streakInfo?.transferCount || 0}</p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <span className="text-white text-lg">{streakInfo?.currentMilestone?.emoji || '🌱'}</span>
            </div>
            <div>
              <p className="text-[#ad92c9] text-xs">Rank</p>
              <p className="text-white font-bold">{streakInfo?.currentMilestone?.name || 'Newcomer'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


