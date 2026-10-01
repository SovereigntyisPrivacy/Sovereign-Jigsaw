import { useState, useRef } from 'react'
import PuzzleBoard from './components/PuzzleBoard'

function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [setupPhase, setSetupPhase] = useState(false)
  const [pieceCount, setPieceCount] = useState(100)
  const [gridConfig, setGridConfig] = useState({ cols: 4, rows: 4 })
  const imgRef = useRef(null)

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          imgRef.current = img
          setImageSrc(e.target.result)
          setSetupPhase(true)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const startGame = () => {
    const aspect = imgRef.current.width / imgRef.current.height
    // Dynamically calculate grid to keep pieces roughly square
    const cols = Math.max(2, Math.round(Math.sqrt(pieceCount * aspect)))
    const rows = Math.max(2, Math.round(Math.sqrt(pieceCount / aspect)))
    setGridConfig({ cols, rows })
    setSetupPhase(false)
  }

  const handleExit = () => {
    setImageSrc(null)
    setSetupPhase(false)
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center p-4">
      {!imageSrc ? (
        <>
          <h1 className="text-3xl font-bold mb-8 text-emerald-500 tracking-wide mt-10">Sovereign Jigsaw</h1>
          <label className="bg-emerald-700 hover:bg-emerald-600 px-8 py-5 rounded-2xl cursor-pointer shadow-xl transition-colors text-xl font-bold mt-10">
            Select Photo from Gallery
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </>
      ) : setupPhase ? (
        <div className="flex flex-col items-center justify-center w-full max-w-md h-full mt-20 bg-neutral-800 p-8 rounded-3xl shadow-2xl border border-neutral-700">
          <h2 className="text-2xl font-bold mb-6 text-white">Choose Difficulty</h2>
          <div className="w-full mb-10 mt-4">
            <div className="flex justify-between text-neutral-400 mb-4 font-medium">
              <span>50</span>
              <span className="text-emerald-400 font-bold text-2xl">{pieceCount} Pieces</span>
              <span>1000</span>
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
            <button onClick={handleExit} className="flex-1 py-4 rounded-xl bg-neutral-700 hover:bg-neutral-600 font-bold text-lg">Back</button>
            <button onClick={startGame} className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg shadow-lg">Start Game</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full h-full absolute inset-0">
          <PuzzleBoard 
            imageSrc={imageSrc} 
            cols={gridConfig.cols} 
            rows={gridConfig.rows} 
            onExit={handleExit} 
          />
        </div>
      )}
    </div>
  )
}

export default App
