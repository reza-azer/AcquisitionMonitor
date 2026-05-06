'use client';

import React from 'react';
import { BarChart3, Activity, Edit2, Database, Settings } from 'lucide-react';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  bgColor: string;
  value: string;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: <BarChart3 strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, gradientFrom: '#003d79', gradientTo: '#3b82f6', iconColor: '#003d79', bgColor: '#e8f0fe', value: 'dashboard' },
  { title: 'Analytics', icon: <Activity strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, gradientFrom: '#8b5cf6', gradientTo: '#a855f7', iconColor: '#8b5cf6', bgColor: '#f0e8fe', value: 'analytics' },
  { title: 'Edit', icon: <Edit2 strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, gradientFrom: '#10b981', gradientTo: '#34d399', iconColor: '#10b981', bgColor: '#e8fef4', value: 'input' },
  { title: 'Backup', icon: <Database strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, gradientFrom: '#f59e0b', gradientTo: '#fbbf24', iconColor: '#f59e0b', bgColor: '#fef5e8', value: 'backup' },
  { title: 'Manage', icon: <Settings strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, gradientFrom: '#ef4444', gradientTo: '#f87171', iconColor: '#ef4444', bgColor: '#fee8e8', value: 'manage' }
];

interface GradientMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function GradientMenu({ activeTab, onTabChange }: GradientMenuProps) {
  return (
    <div className="flex justify-end items-center w-full">
      <ul className="hidden md:flex gap-2 sm:gap-3">
        {menuItems.map(({ title, icon, gradientFrom, gradientTo, iconColor, bgColor, value }, idx) => (
          <li
            key={value}
            style={{
              '--gradient-from': gradientFrom,
              '--gradient-to': gradientTo,
              '--bg-color': bgColor,
              backgroundColor: activeTab === value ? 'transparent' : bgColor
            } as React.CSSProperties}
            onClick={() => onTabChange(value)}
            className={`relative w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer backdrop-blur-md ${
              activeTab === value
                ? 'w-[100px] sm:w-[120px] shadow-none'
                : 'shadow-lg hover:w-[100px] sm:hover:w-[120px] hover:shadow-none'
            } group border border-white/10`}
          >
            {/* Gradient background on hover/active */}
            <span 
              className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-all duration-500 ${
                activeTab === value ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            ></span>
            
            {/* Blur glow */}
            <span 
              className={`absolute top-[6px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[10px] opacity-0 -z-10 transition-all duration-500 ${
                activeTab === value ? 'opacity-50' : 'group-hover:opacity-50'
              }`}
            ></span>

            {/* Icon */}
            <span
              className={`relative z-10 transition-all duration-500 ${
                activeTab === value ? 'scale-0' : 'scale-100 group-hover:scale-0'
              }`}
            >
              <span style={{ color: activeTab === value ? '#ffffff' : iconColor }}>
                {icon}
              </span>
            </span>

            {/* Title */}
            <span 
              className={`absolute text-white uppercase tracking-wide text-[10px] sm:text-xs font-bold transition-all duration-500 ${
                activeTab === value ? 'scale-100' : 'scale-0 group-hover:scale-100'
              }`}
            >
              {title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
