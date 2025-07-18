/**
 * Professional Icon System
 * SVG icons for clean, professional UI without emojis
 */

export interface IconConfig {
  viewBox: string;
  path: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const ICONS: Record<string, IconConfig> = {
  // AI Platform Icons
  chatgpt: {
    viewBox: '0 0 24 24',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    fill: '#10a37f'
  },
  claude: {
    viewBox: '0 0 24 24',
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    fill: '#cc785c'
  },
  gemini: {
    viewBox: '0 0 24 24',
    path: 'M12 2L13.09 8.26L22 9L13.09 15.74L12 22L10.91 15.74L2 9L10.91 8.26L12 2z',
    fill: '#4285f4'
  },
  
  // Action Icons
  screenshot: {
    viewBox: '0 0 24 24',
    path: 'M9 2H7c-1.1 0-2 .9-2 2v2h2V4h2V2zm10 2c0-1.1-.9-2-2-2h-2v2h2v2h2V4zm-2 14h2v-2h-2v2zm0-6h2V8h-2v2zm-4 4h2v-2h-2v2zm0-8h2V6h-2v2zm-4 4h2v-2H9v2zm-4 4h2v-2H5v2zm0-6h2V8H5v2zm8 8h2v-2h-2v2zm4-4h2v-2h-2v2zm0-8h2V6h-2v2z',
    fill: 'currentColor'
  },
  text: {
    viewBox: '0 0 24 24',
    path: 'M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z',
    fill: 'currentColor'
  },
  settings: {
    viewBox: '0 0 24 24',
    path: 'M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z',
    fill: 'currentColor'
  },
  
  // Status Icons
  success: {
    viewBox: '0 0 24 24',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    fill: '#28a745'
  },
  error: {
    viewBox: '0 0 24 24',
    path: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
    fill: '#dc3545'
  },
  info: {
    viewBox: '0 0 24 24',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    fill: '#17a2b8'
  },
  warning: {
    viewBox: '0 0 24 24',
    path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    fill: '#ffc107'
  },
  
  // UI Icons
  close: {
    viewBox: '0 0 24 24',
    path: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    fill: 'currentColor'
  },
  chevron_right: {
    viewBox: '0 0 24 24',
    path: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    fill: 'currentColor'
  },
  check: {
    viewBox: '0 0 24 24',
    path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    fill: 'currentColor'
  }
};

/**
 * Generate SVG icon HTML
 */
export function createIcon(
  iconName: string, 
  size: number = 16, 
  className: string = '',
  color?: string
): string {
  const icon = ICONS[iconName];
  if (!icon) {
    console.warn(`Icon "${iconName}" not found`);
    return '';
  }
  
  const fill = color || icon.fill || 'currentColor';
  const strokeProps = icon.stroke ? `stroke="${icon.stroke}" stroke-width="${icon.strokeWidth || 2}"` : '';
  
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="${icon.viewBox}" fill="${fill}" ${strokeProps}>
    <path d="${icon.path}"/>
  </svg>`;
}

/**
 * Get platform icon HTML
 */
export function getPlatformIcon(platformId: string, size: number = 16): string {
  const iconMap: Record<string, string> = {
    chatgpt: 'chatgpt',
    claude: 'claude',
    gemini: 'gemini'
  };
  
  const iconName = iconMap[platformId] || 'chatgpt';
  return createIcon(iconName, size, 'platform-icon');
}