import { useState } from 'react'
import PuzzleBoard from './components/PuzzleBoard'

function App() {
  const [imageSrc, setImageSrc] = useState(null)

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setImageSrc(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center p-4">
      {!imageSrc ? (
        <>
          <h1 className="text-2xl font-bold mb-6 text-emerald-500 tracking-wide mt-4">Sovereign Jigsaw</h1>
          <label className="bg-emerald-700 hover:bg-emerald-600 px-6 py-4 rounded-xl cursor-pointer shadow-lg transition-colors text-lg font-semibold mt-10">
            Select Photo from Gallery
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </>
      ) : (
        <div className="flex flex-col items-center w-full h-full absolute inset-0">
          <PuzzleBoard 
            imageSrc={imageSrc} 
            cols={4} 
            rows={4} 
            onExit={() => setImageSrc(null)} 
          />
        </div>
      )}
    </div>
  )
}

export default App
