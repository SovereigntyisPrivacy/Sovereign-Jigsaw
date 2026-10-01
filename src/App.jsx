import { useState, useRef, useEffect } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { ImagePlus, Library, Play, Trash2, CheckCircle2, Palette } from 'lucide-react'
import PuzzleBoard from './components/PuzzleBoard'

// Isolated Filter List to prevent circular dependency crashes
const FILTERS = [
  { name: 'Normal', value: 'none' },
  { name: 'Vibrant', value: 'saturate(200%) contrast(110%)' },
  { name: 'B&W', value: 'grayscale(100%) contrast(120%)' },
  { name: 'Vintage', value: 'sepia(80%) contrast(110%)' },
  { name: 'Warm', value: 'sepia(40%) saturate(150%) hue-rotate(-15deg)' },
  { name: 'Cool', value: 'saturate(150%) hue-rotate(180deg)' },
  { name: 'Contrast', value: 'contrast(150%) saturate(120%)' },
  { name: 'Faded', value: 'contrast(80%) brightness(120%) saturate(70%)' }
];

function App() {
  const [currentView, setCurrentView] = useState('home') 
  const [library, setLibrary] = useState([])
  const [activePuzzle, setActivePuzzle] = useState(null)
  
  const [pieceCount, setPieceCount] = useState(100)
  const [filterIndex, setFilterIndex] = useState(0)
  const imgRef = useRef(null)

  useEffect(() => {
    try {
      const savedData = JSON.parse(localStorage.getItem('sovereign_jigsaw_library'));
      const saved = Array.isArray(savedData) ? savedData : [];
      
      // CRASH FIX: Strip out corrupted saves and ensure everything is formatted correctly
      const validSaves = saved.filter(p => p && p.id && Array.isArray(p.pieces));
      setLibrary(validSaves.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0)));
    } catch (e) {
      // If the memory is completely bricked, purge it to recover the app
      setLibrary([]);
      localStorage.removeItem('sovereign_jigsaw_library');
    }
  }, [currentView])

  const openGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.onload = () => {
        imgRef.current = img;
        setActivePuzzle({ id: Date.now(), imageSrc: image.webPath });
        setFilterIndex(0); 
        setCurrentView('setup');
      };
      img.src = image.webPath;
    } catch (error) {
      console.log("Gallery picker cancelled");
    }
  };

  const startGame = () => {
    const aspect = imgRef.current.width / imgRef.current.height
    const cols = Math.max(2, Math.round(Math.sqrt(pieceCount * aspect)))
    const rows = Math.max(2, Math.round(Math.sqrt(pieceCount / aspect)))
    
    setActivePuzzle(prev => ({ ...prev, cols, rows, filterIndex }))
    setCurrentView('game')
  }

  const resumePuzzle = (puzzleData) => {
    setActivePuzzle(puzzleData)
    setCurrentView('game')
  }

  const deletePuzzle = (id) => {
    const updated = library.filter(p => p.id !== id);
    localStorage.setItem('sovereign_jigsaw_library', JSON.stringify(updated));
    setLibrary(updated);
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white flex flex-col items-center p-6">
      
      {currentView === 'home' && (
        <div className="w-full max-w-md flex flex-col items-center mt-10">
          <h1 className="text-4xl font-black mb-12 text-emerald-500 tracking-wide drop-shadow-md">Sovereign Jigsaw</h1>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <button onClick={openGallery} className="bg-emerald-700 hover:bg-emerald-600 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 active:scale-95 border border-emerald-500/30 transition-transform">
              <ImagePlus size={48} className="text-emerald-100" />
              <span className="text-lg font-bold text-emerald-50">New Puzzle</span>
            </button>
            
            <button onClick={() => setCurrentView('library')} className="bg-neutral-800 hover:bg-neutral-700 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 active:scale-95 border border-neutral-600 transition-transform relative">
              <Library size={48} className="text-emerald-400" />
              <span className="text-lg font-bold text-white">My Puzzles</span>
              {library.length > 0 && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-xs font-bold px-2 py-1 rounded-full">{library.length}</div>
              )}
            </button>
          </div>
        </div>
      )}

      {currentView === 'library' && (
        <div className="w-full max-w-md flex flex-col h-full mt-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-emerald-400">My Puzzles</h2>
            <button onClick={() => setCurrentView('home')} className="bg-neutral-800 p-3 rounded-full hover:bg-neutral-700 transition-colors">
              <ArrowLeft size={24} />
            </button>
          </div>

          {library.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-neutral-500 font-bold text-lg">No saved puzzles yet!</div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto pb-10">
              {library.map(puzzle => {
                if (!puzzle || !Array.isArray(puzzle.pieces)) return null;

                const totalPieces = puzzle.cols * puzzle.rows;
                const placedPieces = puzzle.pieces.filter(p => p.isPlaced).length;
                const percent = Math.round((placedPieces / totalPieces) * 100) || 0;
                
                // Safe check fallback to prevent crashes if filter index is out of bounds
                const safeFilter = FILTERS[puzzle.filterIndex] ? FILTERS[puzzle.filterIndex].value : 'none';
                
                return (
                  <div key={puzzle.id} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex gap-4 items-center shadow-lg">
                    <img 
                      src={puzzle.imageSrc} 
                      className="w-24 h-24 rounded-xl object-cover bg-black" 
                      style={{ filter: safeFilter }}
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg">{totalPieces} Pieces</span>
                        {puzzle.status === 'completed' ? (
                          <CheckCircle2 size={24} className="text-emerald-500" />
                        ) : (
                          <span className="text-sm font-bold text-emerald-400">{percent}%</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => resumePuzzle(puzzle)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                          <Play size={18} /> {puzzle.status === 'completed' ? 'View' : 'Resume'}
                        </button>
                        <button onClick={() => deletePuzzle(puzzle.id)} className="bg-red-900/50 hover:bg-red-800 text-red-400 p-2 rounded-lg transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {currentView === 'setup' && (
        <div className="flex flex-col items-center justify-center w-full max-w-md h-full mt-20 bg-neutral-800 p-6 rounded-3xl shadow-2xl border border-neutral-700">
          
          <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-inner bg-black flex items-center justify-center">
             <img 
               src={activePuzzle?.imageSrc} 
               className="max-w-full max-h-full object-contain transition-all duration-300" 
               style={{ filter: FILTERS[filterIndex].value }}
             />
          </div>

          <div className="w-full flex gap-3 overflow-x-auto pb-2 mb-6 touch-pan-x">
            {FILTERS.map((f, i) => (
              <button 
                key={f.name}
                onClick={() => setFilterIndex(i)}
                className={`shrink-0 px-4 py-2 rounded-full font-bold text-sm border-2 transition-all ${filterIndex === i ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-neutral-800 border-neutral-600 text-neutral-400 hover:text-white'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4 text-white">Choose Difficulty</h2>
          <div className="w-full mb-10 mt-2">
            <div className="flex justify-between items-end text-neutral-400 mb-4 font-medium">
              <span className="text-sm">50</span>
              <span className="text-emerald-400 font-black text-3xl">{pieceCount} <span className="text-lg text-emerald-500/70">Pieces</span></span>
              <span className="text-sm">1000</span>
            </div>
            <input 
              type="range" min="50" max="1000" step="10" 
              value={pieceCount} 
              onChange={(e) => setPieceCount(Number(e.target.value))}
              className="w-full h-4 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="flex gap-4 w-full">
            <button onClick={() => setCurrentView('home')} className="flex-1 py-4 rounded-xl bg-neutral-700 hover:bg-neutral-600 font-bold text-lg transition-colors">Cancel</button>
            <button onClick={startGame} className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg shadow-lg transition-colors">Start Game</button>
          </div>
        </div>
      )}

      {currentView === 'game' && (
        <div className="flex flex-col items-center w-full h-full absolute inset-0">
          <PuzzleBoard puzzleData={activePuzzle} onExit={() => setCurrentView('home')} />
        </div>
      )}
    </div>
  )
}

export default App
