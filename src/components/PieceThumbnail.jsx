import React, { useEffect, useState } from 'react';
import { buildPiecePath } from '../utils/jigsawMath';

export default function PieceThumbnail({ piece, image, boardWidth, boardHeight }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!image || !boardWidth || !boardHeight) return;
    
    // Create an invisible transient canvas to save memory
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate bounding box including the tabs that stick out
    const maxTab = Math.min(piece.width, piece.height) * 0.5;
    const bboxWidth = piece.width + (maxTab * 2);
    const bboxHeight = piece.height + (maxTab * 2);

    // Scale it down to fit nicely in the 80px high bottom tray
    const maxSize = 72; 
    const scale = Math.min(maxSize / bboxWidth, maxSize / bboxHeight);

    canvas.width = bboxWidth * scale;
    canvas.height = bboxHeight * scale;

    ctx.scale(scale, scale);
    ctx.translate(maxTab, maxTab); // Shift origin so left/top tabs aren't cut off

    // Draw and cut the piece
    buildPiecePath(ctx, piece.width, piece.height, piece.edges);
    
    ctx.lineWidth = 3 / scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    
    ctx.clip();
    
    // Draw the image, pulling slightly outside the target square to fill the tabs
    ctx.drawImage(
      image,
      ((piece.targetX - maxTab) / boardWidth) * image.width,
      ((piece.targetY - maxTab) / boardHeight) * image.height,
      ((piece.width + maxTab * 2) / boardWidth) * image.width,
      ((piece.height + maxTab * 2) / boardHeight) * image.height,
      -maxTab, -maxTab, piece.width + maxTab * 2, piece.height + maxTab * 2
    );

    setDataUrl(canvas.toDataURL('image/png'));
  }, [piece, image, boardWidth, boardHeight]);

  if (!dataUrl) {
    return <div className="w-12 h-12 animate-pulse bg-white/10 rounded-lg" />;
  }

  return <img src={dataUrl} alt="piece" className="drop-shadow-lg touch-none pointer-events-none" />;
}
