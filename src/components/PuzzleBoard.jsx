import React, { useRef, useEffect, useState } from 'react';
import { Settings, Eye, Grid, ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { generatePuzzleGrid, buildPiecePath } from '../utils/jigsawMath';
import PieceThumbnail from './PieceThumbnail';

export default function PuzzleBoard({ imageSrc, cols = 4, rows = 4, onExit }) {
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [image, setImage] = useState(null);
  const [activePieceId, setActivePieceId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  
  // Camera & Panning State
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  
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

      // Center the camera initially to give some panning room
      setCamera({ 
        x: (window.innerWidth - canvas.width) / 2, 
        y: 50, 
        scale: 1 
      });

      const { pieces: newPieces } = generatePuzzleGrid(canvas.width, canvas.height, cols, rows);
      setPieces(newPieces.map(p => ({ ...p, inTray: true })));
    };
    img.src = imageSrc;
  }, [imageSrc, cols, rows]);

  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear whole screen to accommodate panning
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    // Apply Camera Transform
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Draw Board Outline & Ghost
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
      
      ctx.lineWidth = 2 / camera.scale; // Keep stroke thickness consistent regardless of zoom
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

  const handleZoom = (direction) => {
    setCamera(prev => {
      const zoomFactor = 1.5;
      const newScale = direction === 'in' 
        ? Math.min(prev.scale * zoomFactor, 4) 
        : Math.max(prev.scale / zoomFactor, 0.5);
      
      // Zoom relative to the center of the screen
      const centerX = window.innerWidth / 2;
      const centerY = (window.innerHeight - 120) / 2; // offset for tray
      
      const worldCenterX = (centerX - prev.x) / prev.scale;
      const worldCenterY = (centerY - prev.y) / prev.scale;

      return {
        scale: newScale,
        x: centerX - (worldCenterX * newScale),
        y: centerY - (worldCenterY * newScale)
      };
    });
  };

  const handlePointerDownBoard = (e) => {
    const screenX = e.clientX;
    const screenY = e.clientY;

    // Convert screen tap coordinates to absolute world coordinates
    const worldX = (screenX - camera.x) / camera.scale;
    const worldY = (screenY - camera.y) / camera.scale;

    const boardPieces = pieces.filter(p => !p.inTray);
    let hitPiece = false;

    for (let i = boardPieces.length - 1; i >= 0; i--) {
      const p = boardPieces[i];
      if (p.isPlaced) continue;
      
      // Added generous padding to tap targets for accessibility
      if (worldX >= p.currentX - (p.width*0.3) && worldX <= p.currentX + p.width + (p.width*0.3) && 
          worldY >= p.currentY - (p.height*0.3) && worldY <= p.currentY + p.height + (p.height*0.3)) {
        setActivePieceId(p.id);
        setOffset({ x: worldX - p.currentX, y: worldY - p.currentY });
        e.target.setPointerCapture(e.pointerId);
        hitPiece = true;
        break;
      }
    }

    if (!hitPiece) {
      setIsPanning(true);
      setOffset({ x: screenX, y: screenY }); // reuse offset for panning anchor
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerDownTray = (e, p) => {
    const screenX = e.clientX;
    const screenY = e.clientY;

    // Transform finger coordinate to world coordinate so the piece spawns exactly under the thumb
    const worldX = (screenX - camera.x) / camera.scale;
    const worldY = (screenY - camera.y) / camera.scale;

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
    if (activePieceId) {
      const worldX = (e.clientX - camera.x) / camera.scale;
      const worldY = (e.clientY - camera.y) / camera.scale;
      
      setPieces(prev => prev.map(p => 
        p.id === activePieceId ? { ...p, currentX: worldX - offset.x, currentY: worldY - offset.y } : p
      ));
    } else if (isPanning) {
      const dx = e.clientX - offset.x;
      const dy = e.clientY - offset.y;
      
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setOffset({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e) => {
    if (isPanning) setIsPanning(false);
    if (!activePieceId) return;
    
    // Throw back to tray if dropped in the bottom area
    const isOverTray = e.clientY > window.innerHeight - 120;

    setPieces(prev => prev.map(p => {
      if (p.id === activePieceId) {
        if (isOverTray) {
          return { ...p, inTray: true, isPlaced: false };
        }

        const snapTolerance = Math.max(40, Math.min(p.width, p.height) * 0.35); 
        if (Math.abs(p.currentX - p.targetX) < snapTolerance && Math.abs(p.currentY - p.targetY) < snapTolerance) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true };
        }
      }
      return p;
    }));
    setActivePieceId(null);
  };

  const trayPieces = pieces.filter(p => p.inTray && (!filterEdges || Object.values(p.edges).includes(0)));

  return (
    <div 
      className="flex flex-col w-full h-full relative overflow-hidden" 
      style={{ backgroundColor: bgColor }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm z-20 w-full absolute top-0">
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

      {/* Floating Zoom Controls */}
      <div className="absolute right-4 bottom-36 flex flex-col gap-3 z-20">
        <button onClick={() => handleZoom('in')} className="p-4 bg-black/60 backdrop-blur-sm text-white rounded-2xl shadow-xl border border-white/10 hover:bg-black/80">
          <ZoomIn size={28} />
        </button>
        <button onClick={() => handleZoom('out')} className="p-4 bg-black/60 backdrop-blur-sm text-white rounded-2xl shadow-xl border border-white/10 hover:bg-black/80">
          <ZoomOut size={28} />
        </button>
      </div>

      {/* Main Board */}
      <div className="flex-1 w-full h-full relative">
        <canvas 
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="touch-none absolute top-0 left-0"
          onPointerDown={handlePointerDownBoard}
        />
      </div>

      {/* Bottom Tray */}
      <div className="h-28 bg-black/50 backdrop-blur-md border-t border-white/10 w-full flex items-center px-4 overflow-x-auto whitespace-nowrap gap-4 z-20 touch-pan-x absolute bottom-0">
        {trayPieces.length === 0 ? (
          <p className="text-white/50 mx-auto text-sm font-medium">Tray is empty</p>
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
