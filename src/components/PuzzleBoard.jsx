import React, { useRef, useEffect, useState } from 'react';
import { Settings, Eye, Grid, ArrowLeft } from 'lucide-react';
import { generatePuzzleGrid, buildPiecePath } from '../utils/jigsawMath';
import PieceThumbnail from './PieceThumbnail';

export default function PuzzleBoard({ imageSrc, cols = 4, rows = 4, onExit }) {
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [image, setImage] = useState(null);
  const [activePiece, setActivePiece] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  
  // UI States
  const [bgColor, setBgColor] = useState('#8B5A2B');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [filterEdges, setFilterEdges] = useState(false);
  const [showGhost, setShowGhost] = useState(false);

  const bgOptions = ['#2D3748', '#4A5568', '#276749', '#E2E8F0', '#D6BC97', '#8B5A2B'];

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
      setPieces(newPieces.map(p => ({ ...p, inTray: true })));
    };
    img.src = imageSrc;
  }, [imageSrc, cols, rows]);

  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGhost) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }

    const boardPieces = pieces.filter(p => !p.inTray);
    const sortedPieces = [...boardPieces].sort((a, b) => {
      if (a.id === activePiece?.id) return 1;
      if (b.id === activePiece?.id) return -1;
      if (a.isPlaced) return -1;
      if (b.isPlaced) return 1;
      return 0;
    });

    sortedPieces.forEach(piece => {
      ctx.save();
      ctx.translate(piece.currentX, piece.currentY);
      
      buildPiecePath(ctx, piece.width, piece.height, piece.edges);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = piece.isPlaced ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.8)';
      ctx.stroke();
      ctx.clip();
      
      // maxTab fix: pulls image data from slightly outside the square to cover the tabs
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
  }, [pieces, image, activePiece, showGhost]);

  const handleStart = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const boardPieces = pieces.filter(p => !p.inTray);
    for (let i = boardPieces.length - 1; i >= 0; i--) {
      const p = boardPieces[i];
      if (p.isPlaced) continue;
      
      if (x >= p.currentX - (p.width*0.25) && x <= p.currentX + p.width + (p.width*0.25) && 
          y >= p.currentY - (p.height*0.25) && y <= p.currentY + p.height + (p.height*0.25)) {
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
        const snap = 25; 
        if (Math.abs(p.currentX - p.targetX) < snap && Math.abs(p.currentY - p.targetY) < snap) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true };
        }
      }
      return p;
    }));
    setActivePiece(null);
  };

  const pullFromTray = (id) => {
    setPieces(prev => prev.map(p => 
      p.id === id ? { 
        ...p, 
        inTray: false, 
        currentX: canvasRef.current.width / 2 - p.width / 2, 
        currentY: canvasRef.current.height / 2 - p.height / 2 
      } : p
    ));
  };

  const trayPieces = pieces.filter(p => p.inTray && (!filterEdges || Object.values(p.edges).includes(0)));

  return (
    <div className="flex flex-col w-full h-full relative" style={{ backgroundColor: bgColor }}>
      
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm z-10 w-full">
        <button onClick={onExit} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
          <ArrowLeft size={24} />
        </button>
        
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

      <div className="flex-1 flex justify-center items-center p-2 overflow-hidden w-full">
        <canvas 
          ref={canvasRef}
          className="shadow-2xl touch-none"
          onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
          onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        />
      </div>

      <div className="h-28 bg-black/50 backdrop-blur-md border-t border-white/10 w-full flex items-center px-4 overflow-x-auto whitespace-nowrap gap-4 z-10">
        {trayPieces.length === 0 ? (
          <p className="text-white/50 mx-auto text-sm font-medium">Tray is empty</p>
        ) : (
          trayPieces.map(p => (
            <div 
              key={p.id} 
              onClick={() => pullFromTray(p.id)}
              className="h-20 w-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors shadow-lg shrink-0"
            >
              <PieceThumbnail piece={p} image={image} boardWidth={boardSize.w} boardHeight={boardSize.h} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
