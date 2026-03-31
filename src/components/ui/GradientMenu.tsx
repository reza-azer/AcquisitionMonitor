'use client';

import React from 'react';
import { BarChart3, Activity, Edit2, Database, Settings } from 'lucide-react';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  value: string;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', icon: <BarChart3 />, gradientFrom: '#003d79', gradientTo: '#3b82f6', value: 'dashboard' },
  { title: 'Analytics', icon: <Activity />, gradientFrom: '#8b5cf6', gradientTo: '#a855f7', value: 'analytics' },
  { title: 'Input', icon: <Edit2 />, gradientFrom: '#10b981', gradientTo: '#34d399', value: 'input' },
  { title: 'Backup', icon: <Database />, gradientFrom: '#f59e0b', gradientTo: '#fbbf24', value: 'backup' },
  { title: 'Manage', icon: <Settings />, gradientFrom: '#ef4444', gradientTo: '#f87171', value: 'manage' }
];

interface GradientMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function GradientMenu({ activeTab, onTabChange }: GradientMenuProps) {
  return (
    <div className="flex justify-end items-center w-full">
      <ul className="hidden md:flex gap-2 sm:gap-3">
        {menuItems.map(({ title, icon, gradientFrom, gradientTo, value }, idx) => (
          <li
            key={value}
            style={{ '--gradient-from': gradientFrom, '--gradient-to': gradientTo } as React.CSSProperties}
            onClick={() => onTabChange(value)}
            className={`relative w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer backdrop-blur-md ${
              activeTab === value 
                ? 'w-[100px] sm:w-[120px] shadow-none' 
                : 'bg-white/20 backdrop-blur-md shadow-lg hover:w-[100px] sm:hover:w-[120px] hover:shadow-none'
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
              <span className={`text-sm sm:text-base ${activeTab === value ? 'text-white' : 'text-white/90'}`}>
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
