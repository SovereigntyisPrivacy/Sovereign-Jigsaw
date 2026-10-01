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
  
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [activeQuadrant, setActiveQuadrant] = useState(0); 
  
  const [bgColor, setBgColor] = useState('#8B5A2B');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [filterEdges, setFilterEdges] = useState(false);
  const [showGhost, setShowGhost] = useState(false);

  const bgOptions = ['#2D3748', '#4A5568', '#276749', '#E2E8F0', '#D6BC97', '#8B5A2B'];

  // 1. Initialize Board & Strict Quadrants
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      const maxWidth = window.innerWidth * 0.95;
      const maxHeight = window.innerHeight - 220; 
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      setBoardSize({ w: canvas.width, h: canvas.height });

      const { pieces: newPieces } = generatePuzzleGrid(canvas.width, canvas.height, cols, rows);
      const useQuadrants = (cols * rows) >= 80; // Kick in quadrants a bit earlier for easier scaling
      
      // Strict Grid Indexing (Fixes tab overlap bleeding)
      const midCol = Math.ceil(cols / 2);
      const midRow = Math.ceil(rows / 2);
      const pieceW = canvas.width / cols;
      const pieceH = canvas.height / rows;

      const mappedPieces = newPieces.map(p => {
        let quad = 0;
        if (useQuadrants) {
          const pCol = Math.round(p.targetX / pieceW);
          const pRow = Math.round(p.targetY / pieceH);
          
          if (pCol < midCol && pRow < midRow) quad = 1;
          else if (pCol >= midCol && pRow < midRow) quad = 2;
          else if (pCol < midCol && pRow >= midRow) quad = 3;
          else quad = 4;
        }
        return { ...p, inTray: true, quadrant: quad };
      });
      
      setPieces(mappedPieces);
      setActiveQuadrant(useQuadrants ? 1 : 0);
    };
    img.src = imageSrc;
  }, [imageSrc, cols, rows]);

  // 2. Precision Auto-Camera Framing
  useEffect(() => {
    if (!boardSize.w) return;
    
    // Exact screen space available for the puzzle
    const availableW = window.innerWidth - 40; // 20px padding on left/right
    const availableH = window.innerHeight - 120 - 70 - 40; // Minus tray, toolbar, and 20px padding top/bottom
    
    // Center point of the visible puzzle area
    const cx = window.innerWidth / 2;
    const cy = 70 + (window.innerHeight - 120 - 70) / 2; 

    let quadW = boardSize.w;
    let quadH = boardSize.h;
    let tx = boardSize.w / 2;
    let ty = boardSize.h / 2;

    if (activeQuadrant > 0) {
      const midCol = Math.ceil(cols / 2);
      const midRow = Math.ceil(rows / 2);
      const pieceW = boardSize.w / cols;
      const pieceH = boardSize.h / rows;
      
      if (activeQuadrant === 1) {
        quadW = midCol * pieceW;
        quadH = midRow * pieceH;
        tx = quadW / 2;
        ty = quadH / 2;
      } else if (activeQuadrant === 2) {
        quadW = (cols - midCol) * pieceW;
        quadH = midRow * pieceH;
        tx = (midCol * pieceW) + (quadW / 2);
        ty = quadH / 2;
      } else if (activeQuadrant === 3) {
        quadW = midCol * pieceW;
        quadH = (rows - midRow) * pieceH;
        tx = quadW / 2;
        ty = (midRow * pieceH) + (quadH / 2);
      } else if (activeQuadrant === 4) {
        quadW = (cols - midCol) * pieceW;
        quadH = (rows - midRow) * pieceH;
        tx = (midCol * pieceW) + (quadW / 2);
        ty = (midRow * pieceH) + (quadH / 2);
      }
    }

    // Scale to fill exactly 100% of the available space
    const scale = Math.min(availableW / quadW, availableH / quadH);
    setCamera({ scale, x: cx - (tx * scale), y: cy - (ty * scale) });
  }, [activeQuadrant, boardSize, cols, rows]);

  // 3. Quadrant Completion Tracker
  useEffect(() => {
    if (activeQuadrant === 0 || pieces.length === 0) return;
    const quadPieces = pieces.filter(p => p.quadrant === activeQuadrant);
    const isDone = quadPieces.length > 0 && quadPieces.every(p => p.isPlaced);
    
    if (isDone) {
      const timer = setTimeout(() => {
        setActiveQuadrant(prev => prev === 4 ? 0 : prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pieces, activeQuadrant]);

  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3 / camera.scale;
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
      
      if (worldX >= p.currentX - (p.width*0.25) && worldX <= p.currentX + p.width + (p.width*0.25) && 
          worldY >= p.currentY - (p.height*0.25) && worldY <= p.currentY + p.height + (p.height*0.25)) {
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

    let spawnX = worldX - (p.width / 2);
    let spawnY = worldY - (p.height / 2);

    setPieces(prev => prev.map(piece => 
      piece.id === p.id ? { 
        ...piece, 
        inTray: false, 
        currentX: spawnX, 
        currentY: spawnY 
      } : piece
    ));
    setActivePieceId(p.id);
    setOffset({ x: worldX - spawnX, y: worldY - spawnY });
  };

  const handlePointerMove = (e) => {
    if (!activePieceId) return;
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;
    
    const p = pieces.find(piece => piece.id === activePieceId);
    if (!p) return;

    let newX = worldX - offset.x;
    let newY = worldY - offset.y;
    
    // Strict Intersection Cage: Locks piece inside the Board AND inside the Viewport
    const buffer = Math.min(p.width, p.height) * 0.25;
    
    const viewMinX = -camera.x / camera.scale;
    const viewMaxX = (window.innerWidth - camera.x) / camera.scale - p.width;
    const viewMinY = (70 - camera.y) / camera.scale; 
    const viewMaxY = (window.innerHeight - 120 - camera.y) / camera.scale - p.height; 

    const limitMinX = Math.max(-buffer, viewMinX);
    const limitMaxX = Math.min(boardSize.w - p.width + buffer, viewMaxX);
    const limitMinY = Math.max(-buffer, viewMinY);
    const limitMaxY = Math.min(boardSize.h - p.height + buffer, viewMaxY);

    newX = Math.max(limitMinX, Math.min(limitMaxX, newX));
    newY = Math.max(limitMinY, Math.min(limitMaxY, newY));

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

        // Tightened Snap Tolerance (Prevents premature grabbing)
        const snapTolerance = Math.max(15, Math.min(p.width, p.height) * 0.15); 
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
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm z-20 w-full absolute top-0 h-[70px]">
        <button onClick={onExit} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
          <ArrowLeft size={24} />
        </button>
        
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

      <div className="h-[120px] bg-black/50 backdrop-blur-md border-t border-white/10 w-full flex items-center px-4 overflow-x-auto whitespace-nowrap gap-4 z-20 touch-pan-x absolute bottom-0">
        {trayPieces.length === 0 && activeQuadrant > 0 ? (
          <p className="text-white/50 mx-auto text-sm font-bold tracking-wide">Sector Complete</p>
        ) : trayPieces.length === 0 ? (
          <p className="text-white/50 mx-auto text-sm font-bold tracking-wide">Puzzle Complete</p>
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
