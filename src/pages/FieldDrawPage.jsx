import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFieldImage } from '../lib/storage';
import './FieldDrawPage.css';

const COLORS = [
  { label: 'White',  value: '#ffffff' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Yellow', value: '#facc15' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Black',  value: '#111111' },
];

const SIZES = [3, 6, 12, 22];

function drawDefaultField(ctx, w, h) {
  // Field surface
  ctx.fillStyle = '#2a5c1a';
  ctx.fillRect(0, 0, w, h);

  // Field border
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  const zoneW = w * 0.14;

  // Red alliance zone
  ctx.fillStyle = 'rgba(220,38,38,0.28)';
  ctx.fillRect(6, 6, zoneW, h - 12);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, zoneW, h - 12);
  ctx.fillStyle = 'rgba(220,38,38,0.5)';
  ctx.fillRect(6, 6, 10, h - 12);

  // Blue alliance zone
  ctx.fillStyle = 'rgba(37,99,235,0.28)';
  ctx.fillRect(w - 6 - zoneW, 6, zoneW, h - 12);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(w - 6 - zoneW, 6, zoneW, h - 12);
  ctx.fillStyle = 'rgba(37,99,235,0.5)';
  ctx.fillRect(w - 16, 6, 10, h - 12);

  // Center line (dashed)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 6);
  ctx.lineTo(w / 2, h - 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Zone labels
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `bold ${Math.max(11, h * 0.045)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RED', 6 + zoneW / 2, h / 2);
  ctx.fillText('BLUE', w - 6 - zoneW / 2, h / 2);
}

export function FieldDrawPage() {
  const navigate = useNavigate();
  const bgRef = useRef(null);
  const drawRef = useRef(null);
  const wrapperRef = useRef(null);
  const lastPos = useRef(null);
  const isDrawing = useRef(false);

  const [color, setColor] = useState('#ef4444');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState('pen');
  const [robotTeamNum, setRobotTeamNum] = useState('');
  const [undoStack, setUndoStack] = useState([]);

  const initCanvases = useCallback(() => {
    const wrapper = wrapperRef.current;
    const bg = bgRef.current;
    const draw = drawRef.current;
    if (!wrapper || !bg || !draw) return;

    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (!w || !h) return;

    bg.width = w; bg.height = h;
    draw.width = w; draw.height = h;

    const bgCtx = bg.getContext('2d');
    const customImage = getFieldImage();
    if (customImage) {
      const img = new Image();
      img.onload = () => bgCtx.drawImage(img, 0, 0, w, h);
      img.src = customImage;
    } else {
      drawDefaultField(bgCtx, w, h);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(initCanvases, 100);
    return () => clearTimeout(t);
  }, [initCanvases]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    // In portrait orientation the root element is rotated 90° CW via CSS,
    // so the canvas axes are swapped relative to the viewport. Correct for that.
    if (window.matchMedia('(orientation: portrait)').matches) {
      return {
        x: (rect.bottom - src.clientY) * (canvas.width / rect.height),
        y: (src.clientX - rect.left) * (canvas.height / rect.width),
      };
    }
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const placeRobot = useCallback((canvas, pos) => {
    const ctx = canvas.getContext('2d');
    const r = 22;
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    const label = robotTeamNum || '?';
    const fontSize = label.length > 3 ? 9 : label.length > 2 ? 11 : 13;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pos.x, pos.y);
  }, [color, robotTeamNum]);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = drawRef.current;
    const ctx = canvas.getContext('2d');
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-29), snap]);

    if (tool === 'robot') {
      placeRobot(canvas, getPos(e, canvas));
      return;
    }

    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, [tool, placeRobot]);

  const doDraw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = drawRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = tool === 'eraser' ? size * 4 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.stroke();
    lastPos.current = pos;
  }, [color, size, tool]);

  const stopDraw = useCallback((e) => {
    e?.preventDefault();
    isDrawing.current = false;
  }, []);

  const undo = () => {
    if (!undoStack.length) return;
    const canvas = drawRef.current;
    const ctx = canvas.getContext('2d');
    const snap = undoStack[undoStack.length - 1];
    ctx.putImageData(snap, 0, 0);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const clearDrawing = () => {
    const canvas = drawRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUndoStack([]);
  };

  return (
    <div className="field-page-root">
      {/* Canvas area */}
      <div className="field-canvas-wrapper" ref={wrapperRef}>
        <canvas ref={bgRef} className="field-canvas-bg" />
        <canvas
          ref={drawRef}
          className="field-canvas-draw"
          onMouseDown={startDraw}
          onMouseMove={doDraw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={doDraw}
          onTouchEnd={stopDraw}
        />
      </div>

      {/* Toolbar */}
      <div className="field-toolbar">
        <button className="field-back-btn" onClick={() => navigate('/drive')}>← Back</button>

        <div className="field-toolbar-group">
          <span className="field-toolbar-label">Color</span>
          <div className="field-colors">
            {COLORS.map(c => (
              <button
                key={c.value}
                className={`field-color-btn ${color === c.value ? 'active' : ''}`}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="field-toolbar-group">
          <span className="field-toolbar-label">Size</span>
          <div className="field-sizes">
            {SIZES.map(s => (
              <button
                key={s}
                className={`field-size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                <span style={{ width: Math.min(s * 1.8, 22), height: Math.min(s * 1.8, 22), borderRadius: '50%', background: '#fff', display: 'block' }} />
              </button>
            ))}
          </div>
        </div>

        <div className="field-toolbar-group">
          <span className="field-toolbar-label">Tool</span>
          <div className="field-tools">
            <button
              className={`field-tool-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
            >✏️ Pen</button>
            <button
              className={`field-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
            >⬜ Eraser</button>
            <button
              className={`field-tool-btn ${tool === 'robot' ? 'active' : ''}`}
              onClick={() => setTool('robot')}
            >🤖 Robot</button>
          </div>
        </div>

        {tool === 'robot' && (
          <div className="field-toolbar-group">
            <span className="field-toolbar-label">Team #</span>
            <input
              className="field-team-input"
              type="number"
              placeholder="e.g. 107"
              value={robotTeamNum}
              onChange={e => setRobotTeamNum(e.target.value)}
              min="1"
              max="99999"
            />
            <span className="field-toolbar-hint">Tap field to place</span>
          </div>
        )}

        <div className="field-toolbar-group">
          <span className="field-toolbar-label">Actions</span>
          <div className="field-tools">
            <button
              className="field-action-btn"
              onClick={undo}
              disabled={!undoStack.length}
            >↩ Undo</button>
            <button className="field-action-btn danger" onClick={clearDrawing}>🗑 Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
