import { useEffect, useRef } from 'react'
import { XIcon } from '../icons'

interface TestLogModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  logs: string[]
  status: 'pending' | 'success' | 'failed'
}

export default function TestLogModal({ isOpen, onClose, title, logs, status }: TestLogModalProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!isOpen) return null

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="test-log-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.6)' }}>
            <XIcon />
          </button>
        </div>

        <div className="test-log-content">
          <div className="test-log-status">
            <span className={`status-badge ${status}`}>
              {status === 'pending' && '测试中...'}
              {status === 'success' && '成功'}
              {status === 'failed' && '失败'}
            </span>
          </div>

          <div className="test-log-entries">
            {logs.map((log, index) => (
              <div key={index} className="test-log-entry">
                <span className="log-message">{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="modal-btn secondary" onClick={onClose} style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
