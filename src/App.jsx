import { useState, useRef, useEffect } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { ImagePlus, Library } from 'lucide-react'
import PuzzleBoard from './components/PuzzleBoard'

function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [setupPhase, setSetupPhase] = useState(false)
  const [pieceCount, setPieceCount] = useState(100)
  const [gridConfig, setGridConfig] = useState({ cols: 4, rows: 4 })
  const [hasSave, setHasSave] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const imgRef = useRef(null)

  // Check for saved game when the app loads or returns to menu
  useEffect(() => {
    const saved = localStorage.getItem('sovereign_jigsaw_save')
    if (saved) setHasSave(true)
    else setHasSave(false)
  }, [imageSrc]) 

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
        setImageSrc(image.webPath);
        setSetupPhase(true);
        setIsResuming(false);
      };
      img.src = image.webPath;
    } catch (error) {
      console.log("Gallery picker cancelled or failed", error);
    }
  };

  const startGame = () => {
    const aspect = imgRef.current.width / imgRef.current.height
    const cols = Math.max(2, Math.round(Math.sqrt(pieceCount * aspect)))
    const rows = Math.max(2, Math.round(Math.sqrt(pieceCount / aspect)))
    setGridConfig({ cols, rows })
    setSetupPhase(false)
  }

  const resumeGame = () => {
    const saved = JSON.parse(localStorage.getItem('sovereign_jigsaw_save'))
    if (saved) {
      setImageSrc(saved.imageSrc)
      setGridConfig({ cols: saved.cols, rows: saved.rows })
      setIsResuming(true)
      setSetupPhase(false)
    }
  }

  const handleExit = () => {
    setImageSrc(null)
    setSetupPhase(false)
    setIsResuming(false)
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white flex flex-col items-center p-6">
      {!imageSrc ? (
        <div className="w-full max-w-md flex flex-col items-center mt-10">
          <h1 className="text-4xl font-black mb-12 text-emerald-500 tracking-wide drop-shadow-md">Sovereign Jigsaw</h1>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <button 
              onClick={openGallery} 
              className="bg-emerald-700 hover:bg-emerald-600 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 border border-emerald-500/30"
            >
              <ImagePlus size={48} className="text-emerald-100 drop-shadow" />
              <span className="text-lg font-bold text-emerald-50">New Puzzle</span>
            </button>
            
            <button 
              onClick={hasSave ? resumeGame : undefined}
              className={`${hasSave ? 'bg-neutral-700 hover:bg-neutral-600 border-neutral-500 cursor-pointer active:scale-95' : 'bg-neutral-800 opacity-50 border-neutral-700 cursor-not-allowed'} p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 transition-all border`}
            >
              <Library size={48} className={hasSave ? "text-emerald-400" : "text-neutral-500"} />
              <span className={`text-lg font-bold ${hasSave ? "text-white" : "text-neutral-400"}`}>My Puzzles</span>
            </button>
          </div>
        </div>
      ) : setupPhase ? (
        <div className="flex flex-col items-center justify-center w-full max-w-md h-full mt-20 bg-neutral-800 p-8 rounded-3xl shadow-2xl border border-neutral-700">
          <div className="w-full h-48 mb-8 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-inner bg-black flex items-center justify-center">
             <img src={imageSrc} alt="Preview" className="max-w-full max-h-full object-contain" />
          </div>

          <h2 className="text-2xl font-bold mb-6 text-white">Choose Difficulty</h2>
          <div className="w-full mb-10 mt-2">
            <div className="flex justify-between items-end text-neutral-400 mb-4 font-medium">
              <span className="text-sm">50</span>
              <span className="text-emerald-400 font-black text-3xl">{pieceCount} <span className="text-lg text-emerald-500/70">Pieces</span></span>
              <span className="text-sm">1000</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="1000" 
              step="10" 
              value={pieceCount} 
              onChange={(e) => setPieceCount(Number(e.target.value))}
              className="w-full h-4 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="flex gap-4 w-full">
            <button onClick={handleExit} className="flex-1 py-4 rounded-xl bg-neutral-700 hover:bg-neutral-600 font-bold text-lg transition-colors">Cancel</button>
            <button onClick={startGame} className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg shadow-lg transition-colors">Start Game</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full h-full absolute inset-0">
          <PuzzleBoard 
            imageSrc={imageSrc} 
            cols={gridConfig.cols} 
            rows={gridConfig.rows} 
            onExit={handleExit} 
            isResuming={isResuming}
          />
        </div>
      )}
    </div>
  )
}

export default App
