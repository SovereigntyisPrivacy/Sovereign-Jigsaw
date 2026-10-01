import React, { useRef, useEffect, useState } from 'react';
import { Settings, Eye, Grid, ArrowLeft } from 'lucide-react';
import { generatePuzzleGrid, buildPiecePath } from '../utils/jigsawMath';
import PieceThumbnail from './PieceThumbnail';

export default function PuzzleBoard({ imageSrc, cols = 4, rows = 4, onExit }) {
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [image, setImage] = useState(null);
  const [activePieceId, setActivePieceId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  
  // Auto-Quadrant Camera State
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [activeQuadrant, setActiveQuadrant] = useState(0); 
  
  // UI States
  const [bgColor, setBgColor] = useState('#8B5A2B');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [filterEdges, setFilterEdges] = useState(false);
  const [showGhost, setShowGhost] = useState(false);

  const bgOptions = ['#2D3748', '#4A5568', '#276749', '#E2E8F0', '#D6BC97', '#8B5A2B'];

  // 1. Initialize Board & Quadrants
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      const maxHeight = window.innerHeight * 0.7; 
      const maxWidth = window.innerWidth * 0.95;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      setBoardSize({ w: canvas.width, h: canvas.height });

      const { pieces: newPieces } = generatePuzzleGrid(canvas.width, canvas.height, cols, rows);
      
      // If 100+ pieces, engage quadrant mode
      const useQuadrants = (cols * rows) >= 100;
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;

      const mappedPieces = newPieces.map(p => {
        let quad = 0;
        if (useQuadrants) {
          const centerX = p.targetX + p.width / 2;
          const centerY = p.targetY + p.height / 2;
          if (centerX <= midX && centerY <= midY) quad = 1;       // Top Left
          else if (centerX > midX && centerY <= midY) quad = 2;   // Top Right
          else if (centerX <= midX && centerY > midY) quad = 3;   // Bottom Left
          else quad = 4;                                          // Bottom Right
        }
        return { ...p, inTray: true, quadrant: quad };
      });
      
      setPieces(mappedPieces);
      setActiveQuadrant(useQuadrants ? 1 : 0);
    };
    img.src = imageSrc;
  }, [imageSrc, cols, rows]);

  // 2. Auto-Camera Framing
  useEffect(() => {
    if (!boardSize.w) return;
    const cx = window.innerWidth / 2;
    const cy = (window.innerHeight - 120) / 2; // Offset for the tray

    let scale = 1;
    let tx = boardSize.w / 2;
    let ty = boardSize.h / 2;

    // Zoom in 2x and lock coordinates to the active quadrant
    if (activeQuadrant > 0) {
      scale = 2.1; 
      if (activeQuadrant === 1) { tx = boardSize.w * 0.25; ty = boardSize.h * 0.25; }
      if (activeQuadrant === 2) { tx = boardSize.w * 0.75; ty = boardSize.h * 0.25; }
      if (activeQuadrant === 3) { tx = boardSize.w * 0.25; ty = boardSize.h * 0.75; }
      if (activeQuadrant === 4) { tx = boardSize.w * 0.75; ty = boardSize.h * 0.75; }
    }

    setCamera({ scale, x: cx - (tx * scale), y: cy - (ty * scale) });
  }, [activeQuadrant, boardSize]);

  // 3. Quadrant Completion Tracker
  useEffect(() => {
    if (activeQuadrant === 0 || pieces.length === 0) return;
    const quadPieces = pieces.filter(p => p.quadrant === activeQuadrant);
    const isDone = quadPieces.length > 0 && quadPieces.every(p => p.isPlaced);
    
    if (isDone) {
      // 1.5s delay so she can see the finished section before it automatically slides over
      const timer = setTimeout(() => {
        setActiveQuadrant(prev => prev === 4 ? 0 : prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pieces, activeQuadrant]);

  // Main Render Loop
  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    
    // Apply automated camera transform
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2 / camera.scale;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    if (showGhost) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }

    const boardPieces = pieces.filter(p => !p.inTray);
    const sortedPieces = [...boardPieces].sort((a, b) => {
      if (a.id === activePieceId) return 1;
      if (b.id === activePieceId) return -1;
      if (a.isPlaced) return -1;
      if (b.isPlaced) return 1;
      return 0;
    });

    sortedPieces.forEach(piece => {
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      
      buildPiecePath(ctx, piece.width, piece.height, piece.edges);
      
      ctx.lineWidth = 2 / camera.scale;
      ctx.strokeStyle = piece.isPlaced ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.8)';
      ctx.stroke();
      ctx.clip();
      
      const maxTab = Math.min(piece.width, piece.height) * 0.5;
      ctx.drawImage(
        image,
        ((piece.targetX - maxTab) / canvas.width) * image.width,
        ((piece.targetY - maxTab) / canvas.height) * image.height,
        ((piece.width + maxTab * 2) / canvas.width) * image.width,
        ((piece.height + maxTab * 2) / canvas.height) * image.height,
        -maxTab, -maxTab, piece.width + maxTab * 2, piece.height + maxTab * 2
      );
      
      if (!piece.isPlaced) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
      }
      ctx.restore();
    });

    ctx.restore();
  }, [pieces, image, activePieceId, showGhost, camera]);

  const handlePointerDownBoard = (e) => {
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;

    const boardPieces = pieces.filter(p => !p.inTray);
    for (let i = boardPieces.length - 1; i >= 0; i--) {
      const p = boardPieces[i];
      if (p.isPlaced) continue;
      
      if (worldX >= p.currentX - (p.width*0.3) && worldX <= p.currentX + p.width + (p.width*0.3) && 
          worldY >= p.currentY - (p.height*0.3) && worldY <= p.currentY + p.height + (p.height*0.3)) {
        setActivePieceId(p.id);
        setOffset({ x: worldX - p.currentX, y: worldY - p.currentY });
        e.target.setPointerCapture(e.pointerId);
        break;
      }
    }
  };

  const handlePointerDownTray = (e, p) => {
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;

    setPieces(prev => prev.map(piece => 
      piece.id === p.id ? { 
        ...piece, 
        inTray: false, 
        currentX: worldX - (p.width / 2), 
        currentY: worldY - (p.height / 2) 
      } : piece
    ));
    setActivePieceId(p.id);
    setOffset({ x: p.width / 2, y: p.height / 2 });
  };

  const handlePointerMove = (e) => {
    if (!activePieceId) return;
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;
    
    const p = pieces.find(piece => piece.id === activePieceId);
    if (!p) return;

    let newX = worldX - offset.x;
    let newY = worldY - offset.y;
    
    // BORDER LOCK: Prevents piece from being dragged off the canvas boundaries
    const buffer = Math.min(p.width, p.height) * 0.25; // Allows tabs to overhang slightly
    newX = Math.max(-buffer, Math.min(boardSize.w - p.width + buffer, newX));
    newY = Math.max(-buffer, Math.min(boardSize.h - p.height + buffer, newY));

    setPieces(prev => prev.map(piece => 
      piece.id === activePieceId ? { ...piece, currentX: newX, currentY: newY } : piece
    ));
  };

  const handlePointerUp = (e) => {
    if (!activePieceId) return;
    const isOverTray = e.clientY > window.innerHeight - 120;

    setPieces(prev => prev.map(p => {
      if (p.id === activePieceId) {
        if (isOverTray) return { ...p, inTray: true, isPlaced: false };

        const snapTolerance = Math.max(40, Math.min(p.width, p.height) * 0.45); 
        if (Math.abs(p.currentX - p.targetX) < snapTolerance && Math.abs(p.currentY - p.targetY) < snapTolerance) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true };
        }
      }
      return p;
    }));
    setActivePieceId(null);
  };

  // Only show pieces belonging to the active quadrant
  const trayPieces = pieces.filter(p => 
    p.inTray && 
    (activeQuadrant === 0 || p.quadrant === activeQuadrant) &&
    (!filterEdges || Object.values(p.edges).includes(0))
  );

  return (
    <div 
      className="flex flex-col w-full h-full relative overflow-hidden transition-colors duration-500" 
      style={{ backgroundColor: bgColor }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm z-20 w-full absolute top-0">
        <button onClick={onExit} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
          <ArrowLeft size={24} />
        </button>
        
        {/* Quadrant Indicator */}
        {activeQuadrant > 0 && (
          <div className="text-white/80 font-bold tracking-widest text-sm bg-black/30 px-4 py-1 rounded-full border border-white/10">
            SECTOR {activeQuadrant} / 4
          </div>
        )}
        
        <div className="flex gap-2 bg-white/10 p-1 rounded-full relative">
          <button onClick={() => setFilterEdges(!filterEdges)} className={`p-2 rounded-full ${filterEdges ? 'bg-emerald-500 text-white' : 'text-neutral-300 hover:bg-white/20'}`}>
            <Grid size={20} />
          </button>
          <button onClick={() => setShowGhost(!showGhost)} className={`p-2 rounded-full ${showGhost ? 'bg-emerald-500 text-white' : 'text-neutral-300 hover:bg-white/20'}`}>
            <Eye size={20} />
          </button>
          <button onClick={() => setShowBgPicker(!showBgPicker)} className="p-2 rounded-full text-neutral-300 hover:bg-white/20">
            <Settings size={20} />
          </button>

          {showBgPicker && (
            <div className="absolute top-14 right-0 bg-neutral-800 p-3 rounded-xl shadow-2xl flex flex-wrap w-40 gap-3 border border-neutral-700">
              {bgOptions.map(color => (
                <button 
                  key={color} 
                  onClick={() => { setBgColor(color); setShowBgPicker(false); }}
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-full relative">
        <canvas 
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="touch-none absolute top-0 left-0 transition-transform duration-1000 ease-in-out"
          onPointerDown={handlePointerDownBoard}
        />
      </div>

      <div className="h-28 bg-black/50 backdrop-blur-md border-t border-white/10 w-full flex items-center px-4 overflow-x-auto whitespace-nowrap gap-4 z-20 touch-pan-x absolute bottom-0">
        {trayPieces.length === 0 ? (
          <p className="text-white/50 mx-auto text-sm font-medium">Sector Complete</p>
        ) : (
          trayPieces.map(p => (
            <div 
              key={p.id} 
              onPointerDown={(e) => handlePointerDownTray(e, p)}
              className="h-20 w-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center cursor-pointer shadow-lg shrink-0"
              style={{ touchAction: 'pan-x' }}
            >
              <PieceThumbnail piece={p} image={image} boardWidth={boardSize.w} boardHeight={boardSize.h} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
