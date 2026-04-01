'use client';

import React, { useRef } from 'react';
import { Download, FileDown, Image } from 'lucide-react';
import { exportDataAsCSV } from '@/lib/chart-utils';

interface ExportMenuProps {
  chartData: any[];
  chartName: string;
}

export default function ExportMenu({ chartData, chartName }: ExportMenuProps) {
  const chartRef = useRef<SVGSVGElement>(null);

  const handleExportCSV = () => {
    const filename = `${chartName.replace(/\s+/g, '_')}_data.csv`;
    exportDataAsCSV(chartData, filename);
  };

  const handleExportPNG = async () => {
    const svgElement = document.querySelector('.recharts-wrapper svg') as SVGSVGElement;
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const svgRect = svgElement.getBoundingClientRect();
      const width = svgRect.width * 2;
      const height = svgRect.height * 2;

      canvas.width = width;
      canvas.height = height;

      if (!ctx) return;

      // Create image using document
      const img = document.createElement('img');
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(blob => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${chartName.replace(/\s+/g, '_')}_chart.png`;
            link.click();
          }
        }, 'image/png');
      };

      img.src = url;
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Failed to export chart as PNG');
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400">Export:</span>
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <FileDown className="w-4 h-4" />
        CSV
      </button>
      <button
        onClick={handleExportPNG}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Image className="w-4 h-4" />
        PNG
      </button>
    </div>
  );
}
