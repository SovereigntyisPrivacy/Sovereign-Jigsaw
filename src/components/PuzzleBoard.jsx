import React, { useRef, useEffect, useState } from 'react';
import { Settings, Eye, Grid, ArrowLeft } from 'lucide-react';
import { generatePuzzleGrid, buildPiecePath } from '../utils/jigsawMath';
import PieceThumbnail from './PieceThumbnail';

const FILTERS = [
  { name: 'Normal', value: 'none' },
  { name: 'Vibrant', value: 'saturate(200%) contrast(110%)' },
  { name: 'Golden', value: 'sepia(40%) saturate(250%) brightness(115%) hue-rotate(-5deg)' },
  { name: 'B&W', value: 'grayscale(100%) contrast(120%)' },
  { name: 'Vintage', value: 'sepia(80%) contrast(110%)' },
  { name: 'Warm', value: 'sepia(40%) saturate(150%) hue-rotate(-15deg)' },
  { name: 'Cool', value: 'saturate(150%) hue-rotate(180deg)' },
  { name: 'Midnight', value: 'grayscale(60%) brightness(70%) contrast(150%) sepia(30%) hue-rotate(180deg)' },
  { name: 'Cyberpunk', value: 'saturate(250%) hue-rotate(270deg) contrast(110%)' },
  { name: 'Contrast', value: 'contrast(150%) saturate(120%)' },
  { name: 'Faded', value: 'contrast(80%) brightness(120%) saturate(70%)' },
  { name: 'Inverted', value: 'invert(100%)' }
];

export default function PuzzleBoard({ puzzleData, onExit }) {
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [image, setImage] = useState(null);
  const [activePieceId, setActivePieceId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [activeQuadrant, setActiveQuadrant] = useState(0); 
  const [saveTrigger, setSaveTrigger] = useState(0);

  const safeFilter = FILTERS[puzzleData.filterIndex] ? FILTERS[puzzleData.filterIndex].value : 'none';
  const currentCutStyle = puzzleData.cutStyle || 'classic';
  
  const [bgColor, setBgColor] = useState('#8B5A2B');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [filterEdges, setFilterEdges] = useState(false);
  const [showGhost, setShowGhost] = useState(false);

  const bgOptions = ['#2D3748', '#4A5568', '#276749', '#E2E8F0', '#D6BC97', '#8B5A2B', '#171717'];

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const maxWidth = window.innerWidth * 0.95;
      const maxHeight = window.innerHeight - 220; 
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      const puzzleW = img.width * scale;
      const puzzleH = img.height * scale;
      setBoardSize({ w: puzzleW, h: puzzleH });

      const useQuadrants = (puzzleData.cols * puzzleData.rows) >= 80; 
      const midCol = Math.ceil(puzzleData.cols / 2);
      const midRow = Math.ceil(puzzleData.rows / 2);

      if (puzzleData.pieces) {
        // FIX: Auto-heal any corrupted saves caused by previous floating point math
        const healedPieces = puzzleData.pieces.map(p => {
          let quad = 0;
          if (useQuadrants) {
            const [pCol, pRow] = p.id.split('-').map(Number);
            if (pCol < midCol && pRow < midRow) quad = 1;
            else if (pCol >= midCol && pRow < midRow) quad = 2;
            else if (pCol < midCol && pRow >= midRow) quad = 3;
            else quad = 4;
          }
          return { ...p, quadrant: quad };
        });
        
        setPieces(healedPieces);
        setActiveQuadrant(puzzleData.activeQuadrant || 0);
        return;
      }

      const { pieces: newPieces } = generatePuzzleGrid(puzzleW, puzzleH, puzzleData.cols, puzzleData.rows);

      const mappedPieces = newPieces.map((p) => {
        let quad = 0;
        if (useQuadrants) {
          // FIX: Exact geographical parsing instead of screen-coordinate float division
          const [pCol, pRow] = p.id.split('-').map(Number);
          if (pCol < midCol && pRow < midRow) quad = 1;
          else if (pCol >= midCol && pRow < midRow) quad = 2;
          else if (pCol < midCol && pRow >= midRow) quad = 3;
          else quad = 4;
        }
        return { ...p, inTray: true, quadrant: quad };
      });
      
      for (let i = mappedPieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedPieces[i], mappedPieces[j]] = [mappedPieces[j], mappedPieces[i]];
      }
      
      setPieces(mappedPieces);
      setActiveQuadrant(useQuadrants ? 1 : 0);
    };
    img.src = puzzleData.imageSrc;
  }, [puzzleData]);

  useEffect(() => {
    if (pieces.length === 0 || saveTrigger === 0) return;
    try {
      const isComplete = pieces.every(p => p.isPlaced);
      let library = JSON.parse(localStorage.getItem('sovereign_jigsaw_library')) || [];
      if (!Array.isArray(library)) library = [];
      
      const existingIndex = library.findIndex(p => p.id === puzzleData.id);
      const saveState = {
        ...puzzleData,
        pieces,
        activeQuadrant,
        status: isComplete ? 'completed' : 'active',
        lastPlayed: Date.now()
      };

      if (existingIndex >= 0) {
        library[existingIndex] = saveState;
      } else {
        library.push(saveState);
      }
      localStorage.setItem('sovereign_jigsaw_library', JSON.stringify(library));
    } catch (e) {}
  }, [saveTrigger, activeQuadrant]); 

  useEffect(() => {
    if (!boardSize.w) return;
    
    const availableW = window.innerWidth - 40; 
    const availableH = window.innerHeight - 120 - 70 - 40; 
    const cx = window.innerWidth / 2;
    const cy = 70 + (window.innerHeight - 120 - 70) / 2; 

    let quadW = boardSize.w;
    let quadH = boardSize.h;
    let tx = boardSize.w / 2;
    let ty = boardSize.h / 2;

    if (activeQuadrant > 0) {
      const midCol = Math.ceil(puzzleData.cols / 2);
      const midRow = Math.ceil(puzzleData.rows / 2);
      const pieceW = boardSize.w / puzzleData.cols;
      const pieceH = boardSize.h / puzzleData.rows;
      
      if (activeQuadrant === 1) { quadW = midCol * pieceW; quadH = midRow * pieceH; tx = quadW / 2; ty = quadH / 2; } 
      else if (activeQuadrant === 2) { quadW = (puzzleData.cols - midCol) * pieceW; quadH = midRow * pieceH; tx = (midCol * pieceW) + (quadW / 2); ty = quadH / 2; } 
      else if (activeQuadrant === 3) { quadW = midCol * pieceW; quadH = (puzzleData.rows - midRow) * pieceH; tx = quadW / 2; ty = (midRow * pieceH) + (quadH / 2); } 
      else if (activeQuadrant === 4) { quadW = (puzzleData.cols - midCol) * pieceW; quadH = (puzzleData.rows - midRow) * pieceH; tx = (midCol * pieceW) + (quadW / 2); ty = (midRow * pieceH) + (quadH / 2); }
    }

    const scale = Math.min(availableW / quadW, availableH / quadH);
    setCamera({ scale, x: cx - (tx * scale), y: cy - (ty * scale) });
  }, [activeQuadrant, boardSize, puzzleData.cols, puzzleData.rows]);

  useEffect(() => {
    if (activeQuadrant === 0 || pieces.length === 0) return;
    const quadPieces = pieces.filter(p => p.quadrant === activeQuadrant);
    const isDone = quadPieces.length > 0 && quadPieces.every(p => p.isPlaced);
    
    if (isDone) {
      const timer = setTimeout(() => { 
        setActiveQuadrant(prev => prev === 4 ? 0 : prev + 1); 
        setSaveTrigger(prev => prev + 1); 
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pieces, activeQuadrant]);

  useEffect(() => {
    if (!image || pieces.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3 / camera.scale;
    ctx.strokeRect(0, 0, boardSize.w, boardSize.h);

    if (showGhost) {
      ctx.globalAlpha = 0.2;
      ctx.filter = safeFilter;
      ctx.drawImage(image, 0, 0, boardSize.w, boardSize.h);
      ctx.filter = 'none';
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
      
      buildPiecePath(ctx, piece.width, piece.height, piece.edges, currentCutStyle);
      
      ctx.lineWidth = 2 / camera.scale;
      ctx.strokeStyle = piece.isPlaced ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.8)';
      ctx.stroke();
      ctx.clip();
      
      const maxTab = Math.min(piece.width, piece.height) * 0.5;
      ctx.filter = safeFilter;
      
      ctx.drawImage(
        image,
        ((piece.targetX - maxTab) / boardSize.w) * image.width,
        ((piece.targetY - maxTab) / boardSize.h) * image.height,
        ((piece.width + maxTab * 2) / boardSize.w) * image.width,
        ((piece.height + maxTab * 2) / boardSize.h) * image.height,
        -maxTab, -maxTab, piece.width + maxTab * 2, piece.height + maxTab * 2
      );
      
      ctx.filter = 'none';
      if (!piece.isPlaced) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }, [pieces, image, activePieceId, showGhost, camera, boardSize, safeFilter, currentCutStyle]);

  const handlePointerDownBoard = (e) => {
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;

    const boardPieces = pieces.filter(p => !p.inTray);
    for (let i = boardPieces.length - 1; i >= 0; i--) {
      const p = boardPieces[i];
      if (p.isPlaced) continue;
      
      const maxTab = Math.min(p.width, p.height) * 0.5;
      if (worldX >= p.currentX - maxTab && worldX <= p.currentX + p.width + maxTab && 
          worldY >= p.currentY - maxTab && worldY <= p.currentY + p.height + maxTab) {
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
    const spawnX = worldX - (p.width / 2);
    const spawnY = worldY - (p.height / 2);
    
    setPieces(prev => prev.map(piece => 
      piece.id === p.id ? { ...piece, inTray: false, currentX: spawnX, currentY: spawnY } : piece
    ));
    setActivePieceId(p.id);
    setOffset({ x: worldX - spawnX, y: worldY - spawnY });
  };

  const handlePointerMove = (e) => {
    if (!activePieceId) return;
    const worldX = (e.clientX - camera.x) / camera.scale;
    const worldY = (e.clientY - camera.y) / camera.scale;
    
    const newX = worldX - offset.x;
    const newY = worldY - offset.y;
    
    setPieces(prev => prev.map(piece => 
      piece.id === activePieceId ? { ...piece, currentX: newX, currentY: newY } : piece
    ));
  };

  const handlePointerUp = (e) => {
    if (!activePieceId) return;
    
    setPieces(prev => prev.map(p => {
      if (p.id === activePieceId) {
        const snapTolerance = Math.max(30, Math.min(p.width, p.height) * 0.25); 
        if (Math.abs(p.currentX - p.targetX) < snapTolerance && Math.abs(p.currentY - p.targetY) < snapTolerance) {
          return { ...p, currentX: p.targetX, currentY: p.targetY, isPlaced: true, inTray: false };
        }

        const pieceScreenCenterX = (p.currentX + p.width / 2) * camera.scale + camera.x;
        const pieceScreenCenterY = (p.currentY + p.height / 2) * camera.scale + camera.y;

        const isOverTray = e.clientY > window.innerHeight - 120;
        const isLostInVoid = 
          pieceScreenCenterX < 0 || pieceScreenCenterX > window.innerWidth || 
          pieceScreenCenterY < 70 || pieceScreenCenterY > window.innerHeight - 120;

        if (isOverTray || isLostInVoid) {
          return { ...p, inTray: true, isPlaced: false };
        }
      }
      return p;
    }));
    
    setActivePieceId(null);
    setSaveTrigger(prev => prev + 1); 
  };

  const trayPieces = pieces.filter(p => 
    p.inTray && 
    (activeQuadrant === 0 || p.quadrant === activeQuadrant) &&
    (!filterEdges || Object.values(p.edges).includes(0))
  );

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: bgColor }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm z-20 w-full absolute top-0 h-[70px] pointer-events-none">
        <button onClick={onExit} className="pointer-events-auto p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
          <ArrowLeft size={24} />
        </button>
        
        {activeQuadrant > 0 && (
          <div className="pointer-events-auto text-white/80 font-bold tracking-widest text-sm bg-black/30 px-4 py-1 rounded-full border border-white/10">
            SECTOR {activeQuadrant} / 4
          </div>
        )}
        
        <div className="pointer-events-auto flex gap-2 bg-white/10 p-1 rounded-full relative">
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
                <button key={color} onClick={() => { setBgColor(color); setShowBgPicker(false); }} className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="touch-none absolute top-0 left-0 transition-transform duration-1000 ease-in-out" onPointerDown={handlePointerDownBoard} />
      </div>

      <div className="h-[120px] bg-black/50 backdrop-blur-md border-t border-white/10 w-full flex items-center px-4 overflow-x-auto whitespace-nowrap gap-4 z-20 touch-pan-x absolute bottom-0 pointer-events-auto">
        {trayPieces.length === 0 && activeQuadrant > 0 ? (
          <p className="text-white/50 mx-auto text-sm font-bold tracking-wide">Sector Complete</p>
        ) : trayPieces.length === 0 ? (
          <p className="text-white/50 mx-auto text-sm font-bold tracking-wide">Puzzle Complete!</p>
        ) : (
          trayPieces.map(p => (
            <div key={p.id} onPointerDown={(e) => handlePointerDownTray(e, p)} className="h-20 w-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center cursor-pointer shadow-lg shrink-0" style={{ touchAction: 'pan-x' }}>
              <PieceThumbnail piece={p} image={image} boardWidth={boardSize.w} boardHeight={boardSize.h} imageFilter={safeFilter} cutStyle={currentCutStyle} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
