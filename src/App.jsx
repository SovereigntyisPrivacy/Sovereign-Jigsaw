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
      <h1 className="text-2xl font-bold mb-6 text-emerald-500 tracking-wide">Sovereign Jigsaw</h1>
      
      {!imageSrc ? (
        <label className="bg-emerald-700 hover:bg-emerald-600 px-6 py-4 rounded-xl cursor-pointer shadow-lg transition-colors text-lg font-semibold mt-10">
          Select Photo from Gallery
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      ) : (
        <div className="flex flex-col items-center w-full h-full">
          <div className="mb-6 w-full max-w-3xl flex justify-center">
             <PuzzleBoard imageSrc={imageSrc} cols={4} rows={4} />
          </div>
          <button 
            onClick={() => setImageSrc(null)}
            className="px-6 py-3 bg-neutral-700 rounded-xl hover:bg-neutral-600 font-medium shadow"
          >
            Choose Different Photo
          </button>
        </div>
      )}
    </div>
  )
}

export default App
