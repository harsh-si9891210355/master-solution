import { useNavigate, useSearchParams } from 'react-router'
import { useRoiEditor } from '@/hooks/useRoiEditor'
import { RoiEditorContext } from '@/context/RoiEditorContext'
import { Canvas } from './Canvas'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import '@/assets/Style/ROI/RoiEditor.css'

export const ROIEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cameraId = searchParams.get('cameraId')

  const roiState = useRoiEditor(cameraId ?? undefined)

  const handleSave = async () => {
    await roiState.saveAnnotations()
  }

  return (
    <RoiEditorContext.Provider value={roiState}>
      {/* Inline toast notifications */}
      {roiState.toastMessages.length > 0 && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roiState.toastMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: '10px 18px',
                borderRadius: 6,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                background:
                  msg.severity === 'success' ? '#16a34a'
                  : msg.severity === 'error' ? '#dc2626'
                  : msg.severity === 'warn' ? '#d97706'
                  : '#2563eb',
              }}
            >
              {msg.message}
            </div>
          ))}
        </div>
      )}

      <div className="roi-page-header">
        <div className="roi-header-left">
          <div className="roi-header-title">ROI EDITOR</div>
          <div className="roi-header-subtitle">
            Edit ROI for camera: {roiState.cameraDetails?.name || `Camera ${cameraId ?? ''}`}
          </div>
        </div>

        <div className="roi-action-buttons">
          <button
            className="roi-icon-button"
            onClick={() => {
              void roiState.refreshCanvasFrame()
            }}
            disabled={roiState.isLoadingImage}
            title="Reload canvas frame"
          >
            <span className="material-icons">refresh</span>
            <span className="buttonText">
              {roiState.isLoadingImage ? 'Reloading...' : 'Reload Frame'}
            </span>
          </button>

          <button
            className="roi-icon-button"
            onClick={() => navigate(-1)}
          >
            <span className="material-icons">arrow_back</span>
            <span className="buttonText">Back</span>
          </button>

          <button
            onClick={handleSave}
            disabled={roiState.isSavingAnnotations}
            className="roi-icon-button"
            title="Save ROI"
          >
            <span className="material-icons">save</span>
            <span className="buttonText">
              {roiState.isSavingAnnotations ? 'Saving...' : 'Save'}
            </span>
          </button>
        </div>
      </div>

      <div className="roiWrapper">
        <div className="roiContainer">
          <LeftPanel />
          <Canvas />
          <RightPanel />
        </div>
      </div>
    </RoiEditorContext.Provider>
  )
}

export default ROIEditor
