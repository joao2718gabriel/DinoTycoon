
import React from 'react';
import { DinosaurType } from '../types';

interface PixelDinoProps {
  type: DinosaurType;
  size?: number;
  className?: string;
}

export const PixelDino: React.FC<PixelDinoProps> = ({ type, size = 64, className = "" }) => {
  const renderDino = () => {
    switch (type) {
      case 'TREX':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="6" y="2" width="6" height="4" fill="#e74c3c" />
            <rect x="10" y="3" width="1" height="1" fill="#fff" />
            <rect x="6" y="6" width="3" height="4" fill="#e74c3c" />
            <rect x="4" y="10" width="8" height="2" fill="#e74c3c" />
            <rect x="4" y="12" width="2" height="2" fill="#e74c3c" />
            <rect x="10" y="12" width="2" height="2" fill="#e74c3c" />
          </svg>
        );
      case 'TRICERATOPS':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="2" y="6" width="4" height="4" fill="#3498db" />
            <rect x="1" y="4" width="1" height="4" fill="#ecf0f1" />
            <rect x="5" y="4" width="1" height="2" fill="#ecf0f1" />
            <rect x="6" y="8" width="8" height="4" fill="#3498db" />
            <rect x="6" y="12" width="2" height="2" fill="#3498db" />
            <rect x="12" y="12" width="2" height="2" fill="#3498db" />
          </svg>
        );
      case 'PTERODACTYL':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="2" y="6" width="4" height="2" fill="#9b59b6" />
            <rect x="10" y="6" width="4" height="2" fill="#9b59b6" />
            <rect x="6" y="4" width="4" height="6" fill="#9b59b6" />
            <rect x="7" y="10" width="2" height="4" fill="#9b59b6" />
            <rect x="8" y="5" width="1" height="1" fill="#fff" />
          </svg>
        );
      case 'STEGOSAURUS':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="4" y="8" width="10" height="4" fill="#f1c40f" />
            <rect x="5" y="6" width="2" height="2" fill="#e67e22" />
            <rect x="8" y="6" width="2" height="2" fill="#e67e22" />
            <rect x="11" y="6" width="2" height="2" fill="#e67e22" />
            <rect x="2" y="9" width="2" height="2" fill="#f1c40f" />
            <rect x="5" y="12" width="2" height="2" fill="#f1c40f" />
            <rect x="11" y="12" width="2" height="2" fill="#f1c40f" />
          </svg>
        );
      case 'VELOCIRAPTOR':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="10" y="4" width="4" height="2" fill="#2ecc71" />
            <rect x="8" y="6" width="4" height="2" fill="#2ecc71" />
            <rect x="6" y="8" width="4" height="4" fill="#2ecc71" />
            <rect x="2" y="10" width="4" height="1" fill="#2ecc71" />
            <rect x="6" y="12" width="1" height="2" fill="#2ecc71" />
            <rect x="9" y="12" width="1" height="2" fill="#2ecc71" />
          </svg>
        );
      case 'SPINOSAURUS':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} className={className}>
            <rect x="4" y="2" width="8" height="3" fill="#e67e22" />
            <rect x="6" y="5" width="6" height="5" fill="#e67e22" />
            <rect x="12" y="6" width="2" height="2" fill="#e67e22" />
            <rect x="6" y="10" width="8" height="2" fill="#e67e22" />
            <rect x="6" y="12" width="2" height="2" fill="#e67e22" />
            <rect x="11" y="12" width="2" height="2" fill="#e67e22" />
          </svg>
        );
      default:
        return null;
    }
  };

  return <div className="inline-block drop-shadow-md">{renderDino()}</div>;
};
