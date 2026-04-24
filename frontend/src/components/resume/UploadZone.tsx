import { useCallback, useState } from 'react'
import { Upload, File as FileIcon, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

interface UploadZoneProps {
  onUpload: (file: globalThis.File) => void
  loading?: boolean
}

export function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<globalThis.File | null>(null)

  const handleFile = useCallback((file: globalThis.File) => {
    setSelected(file)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="space-y-4">
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload className={cn('h-10 w-10', dragging ? 'text-indigo-500' : 'text-gray-400')} />
        <div className="text-center">
          <p className="font-medium text-gray-700">Drop your resume here or <span className="text-indigo-600">browse</span></p>
          <p className="mt-1 text-sm text-gray-500">PDF, DOC, DOCX, TXT — max 10 MB</p>
        </div>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      {selected && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <FileIcon className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{(selected.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Button
        onClick={() => selected && onUpload(selected)}
        disabled={!selected}
        loading={loading}
        className="w-full"
      >
        Upload Resume
      </Button>
    </div>
  )
}
