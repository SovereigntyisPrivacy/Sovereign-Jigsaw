import React, { useRef, useEffect, useState } from 'react';
import { generatePuzzleGrid, buildPiecePath } from '../utils/jigsawMath';

export default function PuzzleBoard({ imageSrc, cols = 4, rows = 4 }) {
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [image, setImage] = useState(null);
  const [activePiece, setActivePiece] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      const scale = (window.innerWidth * 0.95) / img.width;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const { pieces: newPieces } = generatePuzzleGrid(canvas.width, canvas.height, cols, rows);
      setPieces(newPieces);
    };
    img.src = imageSrc;
  }, [imageSrc, cols, rows]);

  // Main Render Loop
  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pieces (Placed ones first, floating ones on top, active piece highest)
    const sortedPieces = [...pieces].sort((a, b) => {
      if (a.id === activePiece?.id) return 1;
      if (b.id === activePiece?.id) return -1;
      if (a.isPlaced) return -1;
      if (b.isPlaced) return 1;
      return 0;
    });

    sortedPieces.forEach(piece => {
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      
      // Build clipping path
      buildPiecePath(ctx, piece.width, piece.height, piece.edges);
      
      // Draw Stroke
      ctx.lineWidth = 2;
      ctx.strokeStyle = piece.isPlaced ? 'rgba(0, 0, 0, 0.2)' : '#fff';
      ctx.stroke();

      // Clip and draw image segment
      ctx.clip();
      ctx.drawImage(
        image,
        (piece.targetX / canvas.width) * image.width,
        (piece.targetY / canvas.height) * image.height,
        (piece.width / canvas.width) * image.width,
        (piece.height / canvas.height) * image.height,
        0, 0, piece.width, piece.height
      );
      
      // Add shadow to floating pieces
      if (!piece.isPlaced) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
      }
      ctx.restore();
    });
  }, [pieces, image, activePiece]);

  // Touch & Mouse Interaction
  const handleStart = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Find clicked piece (reverse order to hit top ones first)
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.isPlaced) continue;
      
      if (x >= p.currentX && x <= p.currentX + p.width && 
          y >= p.currentY && y <= p.currentY + p.height) {
        setActivePiece(p);
        setOffset({ x: x - p.currentX, y: y - p.currentY });
        break;
      }
    }
  };

  const handleMove = (e) => {
    if (!activePiece) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setPieces(prev => prev.map(p => 
      p.id === activePiece.id 
        ? { ...p, currentX: (clientX - rect.left) - offset.x, currentY: (clientY - rect.top) - offset.y }
        : p
    ));
  };

  const handleEnd = () => {
    if (!activePiece) return;
    
    setPieces(prev => prev.map(p => {
      if (p.id === activePiece.id) {
        const snapThreshold = 20; // pixels
        const closeX = Math.abs(p.currentX - p.targetX) < snapThreshold;
        const closeY = Math.abs(p.currentY - p.targetY) < snapThreshold;
        
        if (closeX && closeY) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true };
        }
      }
      return p;
    }));
    setActivePiece(null);
  };

  return (
    <canvas 
      ref={canvasRef}
      className="bg-neutral-800 border-2 border-neutral-700 shadow-xl rounded touch-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
}
