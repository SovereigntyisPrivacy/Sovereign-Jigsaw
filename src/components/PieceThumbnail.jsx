import React, { useEffect, useState } from 'react';
import { buildPiecePath } from '../utils/jigsawMath';

export default function PieceThumbnail({ piece, image, boardWidth, boardHeight, imageFilter = 'none', cutStyle = 'classic' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!image || !boardWidth || !boardHeight) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const maxTab = Math.min(piece.width, piece.height) * 0.5;
    const bboxWidth = piece.width + (maxTab * 2);
    const bboxHeight = piece.height + (maxTab * 2);

    const maxSize = 72; 
    const scale = Math.min(maxSize / bboxWidth, maxSize / bboxHeight);

    canvas.width = bboxWidth * scale;
    canvas.height = bboxHeight * scale;

    ctx.scale(scale, scale);
    ctx.translate(maxTab, maxTab);

    buildPiecePath(ctx, piece.width, piece.height, piece.edges, cutStyle);
    
    ctx.lineWidth = 3 / scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    
    ctx.clip();
    ctx.filter = imageFilter;
    
    ctx.drawImage(
      image,
      ((piece.targetX - maxTab) / boardWidth) * image.width,
      ((piece.targetY - maxTab) / boardHeight) * image.height,
      ((piece.width + maxTab * 2) / boardWidth) * image.width,
      ((piece.height + maxTab * 2) / boardHeight) * image.height,
      -maxTab, -maxTab, piece.width + maxTab * 2, piece.height + maxTab * 2
    );
    
    ctx.filter = 'none';
    setDataUrl(canvas.toDataURL('image/png'));
  }, [piece, image, boardWidth, boardHeight, imageFilter, cutStyle]);

  if (!dataUrl) {
    return <div className="w-12 h-12 animate-pulse bg-white/10 rounded-lg" />;
  }

  return <img src={dataUrl} alt="piece" className="drop-shadow-lg touch-none pointer-events-none" />;
}
