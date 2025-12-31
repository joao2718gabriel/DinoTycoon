
import React from 'react';
import { DinosaurType } from '../types';

interface PixelDinoProps {
  type: DinosaurType;
  size?: number;
  className?: string;
}

export const PixelDino: React.FC<PixelDinoProps> = ({ type, size = 64, className = "" }) => {
  const renderDino = () => {
    const svgProps = {
      viewBox: "0 0 32 32",
      width: size,
      height: size,
      className: className,
      style: { shapeRendering: 'crispEdges' as const }
    };

    switch (type) {
      case 'VELOCIRAPTOR':
        return (
          <svg {...svgProps}>
            <rect x="8" y="28" width="16" height="1" fill="rgba(0,0,0,0.2)" />
            {/* Cauda e Dorso */}
            <rect x="2" y="16" width="12" height="2" fill="#3a4d25" />
            <rect x="4" y="15" width="10" height="2" fill="#4d6331" />
            <rect x="10" y="14" width="6" height="1" fill="#2d3a1c" />
            {/* Corpo */}
            <rect x="12" y="17" width="10" height="7" fill="#6b8c42" />
            <rect x="14" y="17" width="8" height="2" fill="#4d6331" /> {/* Listra dorso */}
            <rect x="13" y="19" width="8" height="5" fill="#c28151" /> {/* Peito/Ventre */}
            {/* Pernas e Garra Assassina */}
            <rect x="14" y="24" width="3" height="4" fill="#3a4d25" />
            <rect x="13" y="27" width="2" height="1" fill="#000" /> {/* Garra */}
            <rect x="19" y="24" width="3" height="4" fill="#3a4d25" />
            <rect x="21" y="27" width="2" height="1" fill="#000" />
            {/* Cabeça Detalhada */}
            <rect x="22" y="10" width="8" height="5" fill="#6b8c42" />
            <rect x="24" y="9" width="4" height="1" fill="#4d6331" />
            <rect x="23" y="15" width="7" height="2" fill="#c28151" />
            <rect x="25" y="14" width="5" height="1" fill="#1a1a1a" /> {/* Boca */}
            <rect x="25" y="11" width="1" height="1" fill="#ffec00" /> {/* Olho */}
            <rect x="26" y="11" width="1" height="1" fill="#000" /> {/* Pupila */}
          </svg>
        );
      case 'TREX':
        return (
          <svg {...svgProps}>
            <rect x="6" y="29" width="20" height="1" fill="rgba(0,0,0,0.2)" />
            {/* Cauda Robusta */}
            <rect x="0" y="20" width="12" height="5" fill="#7a2319" />
            <rect x="2" y="21" width="10" height="3" fill="#912a1e" />
            {/* Corpo e Ventre */}
            <rect x="10" y="15" width="14" height="12" fill="#c0392b" />
            <rect x="12" y="17" width="10" height="10" fill="#e74c3c" />
            <rect x="13" y="22" width="6" height="5" fill="#edbb99" /> {/* Ventre claro */}
            {/* Pernas Potentes */}
            <rect x="11" y="27" width="5" height="4" fill="#7a2319" />
            <rect x="19" y="27" width="5" height="4" fill="#7a2319" />
            <rect x="11" y="30" width="2" height="1" fill="#1a1a1a" /> {/* Unha */}
            <rect x="22" y="30" width="2" height="1" fill="#1a1a1a" />
            {/* Cabeça Massiva */}
            <rect x="18" y="4" width="13" height="10" fill="#c0392b" />
            <rect x="20" y="6" width="10" height="8" fill="#e74c3c" />
            <rect x="21" y="12" width="9" height="1" fill="#1a1a1a" /> {/* Linha da boca */}
            <rect x="22" y="13" width="1" height="1" fill="#fff" /> {/* Dente 1 */}
            <rect x="26" y="13" width="1" height="1" fill="#fff" /> {/* Dente 2 */}
            <rect x="28" y="13" width="1" height="1" fill="#fff" /> {/* Dente 3 */}
            <rect x="24" y="7" width="2" height="2" fill="#edbb99" /> {/* Cavidade olho */}
            <rect x="25" y="7" width="1" height="1" fill="#000" /> {/* Olho */}
            {/* Braços */}
            <rect x="23" y="17" width="3" height="1" fill="#1a1a1a" />
          </svg>
        );
      case 'TRICERATOPS':
        return (
          <svg {...svgProps}>
            <rect x="4" y="29" width="24" height="1" fill="rgba(0,0,0,0.15)" />
            {/* Corpo Pesado */}
            <rect x="12" y="16" width="16" height="11" fill="#21618c" />
            <rect x="14" y="18" width="12" height="8" fill="#3498db" />
            <rect x="16" y="17" width="4" height="2" fill="#5dade2" /> {/* Brilho pele */}
            {/* Patas de Elefante */}
            <rect x="12" y="27" width="5" height="4" fill="#1a5276" />
            <rect x="23" y="27" width="5" height="4" fill="#1a5276" />
            {/* Gola/Escudo Detalhado */}
            <rect x="6" y="6" width="12" height="14" fill="#21618c" />
            <rect x="8" y="8" width="3" height="3" fill="#1a1a1a" opacity="0.4" /> {/* Padrão gola */}
            <rect x="13" y="12" width="3" height="3" fill="#1a1a1a" opacity="0.4" />
            {/* Cabeça e Chifres com Gradiente */}
            <rect x="2" y="15" width="10" height="8" fill="#3498db" />
            <rect x="0" y="17" width="3" height="3" fill="#d5dbdb" /> {/* Bico */}
            <rect x="0" y="13" width="4" height="2" fill="#f4f6f7" /> {/* Chifre Nariz */}
            <rect x="3" y="5" width="2" height="10" fill="#f4f6f7" /> {/* Chifre Cima 1 */}
            <rect x="3" y="5" width="2" height="3" fill="#bdc3c7" /> {/* Ponta chifre */}
            <rect x="9" y="5" width="2" height="10" fill="#f4f6f7" /> {/* Chifre Cima 2 */}
            <rect x="9" y="5" width="2" height="3" fill="#bdc3c7" />
            <rect x="5" y="18" width="1" height="1" fill="#000" /> {/* Olho */}
          </svg>
        );
      case 'PTERODACTYL':
        return (
          <svg {...svgProps}>
            {/* Asas com Veias e Membranas */}
            <rect x="2" y="13" width="28" height="2" fill="#6c3483" />
            <rect x="4" y="11" width="11" height="7" fill="#9b59b6" opacity="0.6" />
            <rect x="17" y="11" width="11" height="7" fill="#9b59b6" opacity="0.6" />
            <rect x="6" y="12" width="1" height="4" fill="#5b2c6f" /> {/* Veia asa */}
            <rect x="25" y="12" width="1" height="4" fill="#5b2c6f" />
            {/* Corpo e Crista */}
            <rect x="14" y="8" width="4" height="14" fill="#7d3c98" />
            <rect x="14" y="4" width="6" height="5" fill="#9b59b6" />
            <rect x="12" y="0" width="2" height="8" fill="#e74c3c" /> {/* Crista vermelha */}
            {/* Cabeça e Bico */}
            <rect x="20" y="6" width="10" height="2" fill="#f1c40f" />
            <rect x="20" y="8" width="8" height="1" fill="#d4ac0d" />
            <rect x="17" y="6" width="1" height="1" fill="#000" /> {/* Olho */}
            {/* Pernas e Garras */}
            <rect x="14" y="22" width="1" height="4" fill="#7d3c98" />
            <rect x="17" y="22" width="1" height="4" fill="#7d3c98" />
          </svg>
        );
      case 'STEGOSAURUS':
        return (
          <svg {...svgProps}>
            <rect x="4" y="29" width="24" height="1" fill="rgba(0,0,0,0.15)" />
            {/* Corpo com Escamas Sugeridas */}
            <rect x="6" y="15" width="20" height="12" fill="#d4ac0d" />
            <rect x="8" y="17" width="16" height="9" fill="#f1c40f" />
            <rect x="10" y="19" width="2" height="2" fill="#b7950b" /> {/* Mancha */}
            <rect x="18" y="21" width="2" height="2" fill="#b7950b" />
            {/* Placas Dorsais de 3 Cores */}
            <rect x="7" y="10" width="5" height="5" fill="#7b241c" />
            <rect x="8" y="11" width="3" height="3" fill="#c0392b" />
            <rect x="13" y="7" width="6" height="8" fill="#7b241c" />
            <rect x="14" y="8" width="4" height="6" fill="#c0392b" />
            <rect x="20" y="10" width="5" height="5" fill="#7b241c" />
            <rect x="21" y="11" width="3" height="3" fill="#c0392b" />
            {/* Cabeça e Patas */}
            <rect x="26" y="21" width="5" height="4" fill="#f1c40f" />
            <rect x="28" y="22" width="1" height="1" fill="#000" />
            <rect x="8" y="27" width="4" height="4" fill="#9a7d0a" />
            <rect x="21" y="27" width="4" height="4" fill="#9a7d0a" />
            {/* Cauda e Thagomizer (Espinhos) */}
            <rect x="0" y="18" width="7" height="4" fill="#d4ac0d" />
            <rect x="0" y="15" width="1" height="4" fill="#ecf0f1" />
            <rect x="2" y="14" width="1" height="5" fill="#ecf0f1" />
            <rect x="0" y="15" width="1" height="1" fill="#bdc3c7" /> {/* Pontas */}
            <rect x="2" y="14" width="1" height="1" fill="#bdc3c7" />
          </svg>
        );
      case 'SPINOSAURUS':
        return (
          <svg {...svgProps}>
            <rect x="4" y="30" width="24" height="1" fill="rgba(0,0,0,0.2)" />
            {/* Vela Dorsal Majestosa */}
            <rect x="6" y="2" width="20" height="14" fill="#922b21" />
            <rect x="8" y="4" width="16" height="12" fill="#c0392b" />
            <rect x="10" y="3" width="2" height="13" fill="#e74c3c" /> {/* Listras de aviso na vela */}
            <rect x="16" y="2" width="2" height="14" fill="#e74c3c" />
            <rect x="22" y="4" width="2" height="12" fill="#e74c3c" />
            {/* Corpo e Postura */}
            <rect x="4" y="16" width="22" height="10" fill="#ba4a00" />
            <rect x="6" y="18" width="18" height="7" fill="#e67e22" />
            {/* Cabeça de Crocodilo */}
            <rect x="25" y="12" width="7" height="6" fill="#ba4a00" />
            <rect x="26" y="13" width="6" height="4" fill="#e67e22" />
            <rect x="27" y="15" width="5" height="1" fill="#1a1a1a" /> {/* Boca longa */}
            <rect x="27" y="13" width="1" height="1" fill="#000" /> {/* Olho */}
            {/* Pernas Curtas e Fortes */}
            <rect x="8" y="26" width="5" height="5" fill="#6e2c00" />
            <rect x="19" y="26" width="5" height="5" fill="#6e2c00" />
            <rect x="8" y="30" width="2" height="1" fill="#000" />
            <rect x="22" y="30" width="2" height="1" fill="#000" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`inline-block filter drop-shadow-[3px_3px_0px_rgba(0,0,0,0.4)] ${className}`}>
      {renderDino()}
    </div>
  );
};
