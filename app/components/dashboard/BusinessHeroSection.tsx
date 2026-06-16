'use client';

import NotificationBell from '../NotificationBell';
import { formatBalance, formatUSD } from '@/app/lib/chain';
import { UserData } from '../../lib/api';
import { Wallet, ArrowDownLeft, BarChart3, Check } from 'lucide-react';

interface BusinessHeroSectionProps {
  userData: UserData | null;
  walletAddress: string;
  balance: number;
  streakInfo: any;
}

export default function BusinessHeroSection({ 
  userData, 
  walletAddress, 
  balance, 
  streakInfo 
}: BusinessHeroSectionProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, string> = {
      retail: '🛍️',
      food: '🍕',
      services: '🔧',
      technology: '💻',
      healthcare: '🏥',
      entertainment: '🎬',
      other: '🏢',
    };
    return icons[category || 'other'] || '🏢';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[380px]">
      {/* Professional Business Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1030] via-[#2d1b4e] to-[#1a0a2e]" />
      
      {/* Purple Business Accent Orbs */}
      <div className="absolute top-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute bottom-[-20%] left-[-5%] w-[350px] h-[350px] rounded-full bg-violet-500/15 blur-[80px] animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
      <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] rounded-full bg-fuchsia-500/10 blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      
      {/* Content */}
      <div className="relative z-10 h-full p-6 md:p-10 flex flex-col">
        {/* Top Row: Business Badge + Notification */}
        <div className="flex items-start justify-between mb-auto">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 flex items-center gap-2">
              <span className="text-sm">{getCategoryIcon(userData?.businessInfo?.category)}</span>
              <span className="text-xs font-bold text-purple-300 uppercase">
                {userData?.businessInfo?.category || 'Business'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/80">Active</span>
            </div>
          </div>
          <div className="hidden lg:flex">
            <NotificationBell walletAddress={walletAddress} />
          </div>
        </div>

        {/* Main Business Welcome */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            {/* Business Logo/Avatar */}
            <div className="relative">
              {userData?.avatarUrl ? (
                <img 
                  src={userData.avatarUrl} 
                  alt={userData.displayName} 
                  className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-purple-500/30 shadow-xl shadow-purple-500/20"
                />
              ) : (
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center border-4 border-purple-500/30 shadow-xl shadow-purple-500/20">
                  <span className="text-4xl md:text-5xl">
                    {userData?.displayName?.[0]?.toUpperCase() || '🏢'}
                  </span>
                </div>
              )}
              {/* Verified Badge */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center border-2 border-[#1a1030]">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Welcome Text */}
            <div>
              <p className="text-purple-300 text-sm md:text-base font-medium mb-1">
                {getGreeting()}
              </p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                Welcome back,
              </h1>
              <h2 
                className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent w-fit"
                style={{
                  background: 'linear-gradient(to right, #c084fc, #a855f7, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {userData?.displayName || 'Business'}
              </h2>
            </div>
          </div>

          {/* Business Description */}
          {userData?.businessInfo?.description && (
            <p className="text-purple-200/60 text-sm md:text-base max-w-lg mb-4">
              {userData.businessInfo.description}
            </p>
          )}

          {/* Owner Info */}
          {userData?.businessInfo && (
            <p className="text-purple-300/50 text-xs">
              Owned by {userData.businessInfo.ownerFirstName} {userData.businessInfo.ownerLastName} • @{userData.username}
            </p>
          )}
        </div>

        {/* Business Stats Cards */}
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-purple-500/20 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-purple-300/60 text-xs">Balance</p>
              <p className="text-white font-bold">{formatBalance(balance)} USDC</p>
              <p className="text-purple-300/40 text-[10px]">{formatUSD(balance)}</p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-purple-500/20 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-purple-300/60 text-xs">Payments Received</p>
              <p className="text-white font-bold">{streakInfo?.transferCount || 0}</p>
            </div>
          </div>
          
          <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-purple-500/20 flex items-center gap-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-purple-300/60 text-xs">Total Received</p>
              <p className="text-white font-bold">{formatBalance(userData?.totalReceived || 0)} USDC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


