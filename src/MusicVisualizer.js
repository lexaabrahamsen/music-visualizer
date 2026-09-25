import React, { useState, useEffect, useRef } from 'react';

const STYLES = ['radial', 'sphere', 'blob', 'bars', 'wave', 'starfield', 'spectrum'];
const STYLE_LABELS = {
  radial: 'Radial Burst',
  sphere: 'Sphere',
  blob: 'Blob',
  bars: 'Circular Bars',
  wave: 'Waveform',
  starfield: 'Starfield',
  spectrum: 'Spectrum',
};

// Single coral/orange accent family, matching the app's UI palette.
// Lightness follows amplitude; hue drifts slightly warmer across position.
const ACCENT = '#e8927c';
function getColor(value, t) {
  const lightness = 45 + value * 25;
  const hue = 14 + t * 22;
  return `hsl(${hue}, 80%, ${lightness}%)`;
}

const MusicVisualizer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [particleSize, setParticleSize] = useState(3);
  const [vizStyle, setVizStyle] = useState('radial');

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const rotationRef = useRef(0);
  const starsRef = useRef(null);

  // Refs mirror the live control state so the animation loop (captured once
  // per play session) always reads the current values instead of stale ones.
  const sensitivityRef = useRef(sensitivity);
  const particleSizeRef = useRef(particleSize);
  const vizStyleRef = useRef(vizStyle);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);
  useEffect(() => {
    particleSizeRef.current = particleSize;
  }, [particleSize]);
  useEffect(() => {
    vizStyleRef.current = vizStyle;
  }, [vizStyle]);

  const togglePlay = async () => {
    if (isPlaying) {
      sourceRef.current.stop();
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      setIsPlaying(false);
      return;
    }

    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContextRef.current.createAnalyser();
    sourceRef.current = audioContextRef.current.createBufferSource();

    const response = await fetch(
      'https://cdn.pixabay.com/audio/2022/04/25/audio_5d61b5204f.mp3'
    );
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(
      arrayBuffer
    );

    sourceRef.current.buffer = audioBuffer;
    sourceRef.current.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Draws a rotating radial burst of glowing particles connected by a
    // faint web of lines, driven by the current sensitivity/particle-size
    // controls.
    const drawRadial = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.16;
      const maxExtra = Math.min(w, h) * 0.32;
      const currentSensitivity = sensitivityRef.current;
      const currentSize = particleSizeRef.current;

      rotationRef.current += 0.0015;
      const rotation = rotationRef.current;

      const n = frameData.length;
      let total = 0;
      const points = new Array(n);
      for (let i = 0; i < n; i++) {
        const value = frameData[i] / 255;
        total += value;
        const angle = (i / n) * Math.PI * 2 + rotation;
        const r = baseRadius + value * currentSensitivity * maxExtra;
        points[i] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          value,
          t: i / n,
        };
      }

      // Faint connecting web
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Glowing particles
      points.forEach((p) => {
        const color = getColor(p.value, p.t);
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize + p.value * currentSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Pulsing core
      const avg = total / n;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + avg * 0.3})`;
      ctx.arc(cx, cy, baseRadius * 0.5 * (0.8 + avg * 0.4), 0, Math.PI * 2);
      ctx.fill();
    };

    // Draws a rotating wireframe sphere whose vertices are displaced
    // outward by frequency data, giving a spiky, organic, audio-reactive
    // globe with a rainbow mesh, similar to 3D audio-reactive visualizers.
    const drawSphere = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.26;
      const currentSensitivity = sensitivityRef.current;
      const currentSize = particleSizeRef.current;

      rotationRef.current += 0.004;
      const rotation = rotationRef.current;

      const latSegments = 12;
      const lonSegments = 18;
      const n = frameData.length;
      const focal = baseR * 3.2;

      const grid = [];
      for (let i = 0; i <= latSegments; i++) {
        const theta = (i / latSegments) * Math.PI;
        const row = [];
        for (let j = 0; j < lonSegments; j++) {
          const phi = (j / lonSegments) * Math.PI * 2 + rotation;

          const x = Math.sin(theta) * Math.cos(phi);
          const y = Math.cos(theta);
          const z = Math.sin(theta) * Math.sin(phi);

          // Scatter frequency assignment pseudo-randomly across the grid
          // (rather than in raster order) so bass-heavy low bins don't all
          // land on the same ring and pull the sphere into a teardrop.
          const hash = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);
          const freqIndex = Math.floor((hash - Math.floor(hash)) * n);
          const value = frameData[freqIndex] / 255;
          const r = baseR * (1 + value * currentSensitivity * 0.6);

          const scale = focal / (focal + z * r);
          row.push({
            x: cx + x * r * scale,
            y: cy + y * r * scale,
            value,
            t: j / lonSegments,
          });
        }
        grid.push(row);
      }

      ctx.lineWidth = Math.max(1, currentSize * 0.5);

      // Longitude lines (pole to pole)
      for (let j = 0; j < lonSegments; j++) {
        ctx.beginPath();
        for (let i = 0; i <= latSegments; i++) {
          const p = grid[i][j];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = getColor(0.5, j / lonSegments);
        ctx.globalAlpha = 0.8;
        ctx.stroke();
      }

      // Latitude rings
      for (let i = 0; i <= latSegments; i++) {
        ctx.beginPath();
        for (let j = 0; j <= lonSegments; j++) {
          const p = grid[i][j % lonSegments];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = getColor(0.5, i / latSegments);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Glowing highlights at high-energy vertices
      grid.forEach((row) => {
        row.forEach((p) => {
          if (p.value > 0.55) {
            const color = getColor(p.value, p.t);
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, currentSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      });
    };

    // Draws a smooth, filled, morphing blob (no individual dots/wireframe)
    // by fitting a rounded curve through downsampled frequency points and
    // filling it with a soft radial gradient.
    const drawBlob = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.2;
      const maxExtra = Math.min(w, h) * 0.24;
      const currentSensitivity = sensitivityRef.current;

      rotationRef.current += 0.001;
      const rotation = rotationRef.current;

      // Downsample to a small point count so the curve reads as smooth.
      const pointCount = 28;
      const n = frameData.length;
      const points = new Array(pointCount);
      for (let i = 0; i < pointCount; i++) {
        const value = frameData[Math.floor((i / pointCount) * n)] / 255;
        const angle = (i / pointCount) * Math.PI * 2 + rotation;
        const r = baseRadius + value * currentSensitivity * maxExtra;
        points[i] = {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          t: i / pointCount,
        };
      }

      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius + maxExtra);
      gradient.addColorStop(0, getColor(0.8, 0.5));
      gradient.addColorStop(1, getColor(0.2, 0.9));

      ctx.beginPath();
      const start = mid(points[pointCount - 1], points[0]);
      ctx.moveTo(start.x, start.y);
      for (let i = 0; i < pointCount; i++) {
        const next = points[(i + 1) % pointCount];
        const m = mid(points[i], next);
        ctx.quadraticCurveTo(points[i].x, points[i].y, m.x, m.y);
      }
      ctx.closePath();

      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = getColor(0.6, 0.5);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Draws classic thick rounded bars radiating from a center ring, like
    // a circular equalizer.
    const drawBars = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const innerR = Math.min(w, h) * 0.14;
      const maxLen = Math.min(w, h) * 0.32;
      const currentSensitivity = sensitivityRef.current;
      const currentSize = particleSizeRef.current;

      rotationRef.current += 0.001;
      const rotation = rotationRef.current;

      const barCount = 48;
      const n = frameData.length;

      for (let i = 0; i < barCount; i++) {
        const value = frameData[Math.floor((i / barCount) * n)] / 255;
        const angle = (i / barCount) * Math.PI * 2 + rotation;
        const len = 4 + value * currentSensitivity * maxLen;
        const barWidth = Math.max(2, currentSize * 1.3);
        const color = getColor(value, i / barCount);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        const r = barWidth / 2;
        // rounded rect radiating outward from innerR
        ctx.beginPath();
        ctx.moveTo(innerR + r, 0);
        ctx.arcTo(innerR + len, -barWidth / 2, innerR + len, 0, r);
        ctx.arcTo(innerR + len, barWidth / 2, innerR, barWidth / 2, r);
        ctx.arcTo(innerR, barWidth / 2, innerR, -barWidth / 2, r);
        ctx.arcTo(innerR, -barWidth / 2, innerR + len, -barWidth / 2, r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.stroke();
    };

    // Draws a flowing horizontal ribbon/waveform with a gradient fill
    // beneath it, calmer and less "exploded" than the radial styles.
    const drawWave = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      const currentSensitivity = sensitivityRef.current;
      const n = frameData.length;

      rotationRef.current += 0.03;
      const phase = rotationRef.current;

      const pointCount = 64;
      const points = new Array(pointCount + 1);
      for (let i = 0; i <= pointCount; i++) {
        const value = frameData[Math.floor((i / pointCount) * (n - 1))] / 255;
        const x = (i / pointCount) * w;
        const wobble = Math.sin(i * 0.4 + phase) * 6;
        const y = midY - value * currentSensitivity * h * 0.32 + wobble;
        points[i] = { x, y, t: i / pointCount };
      }

      // Gradient fill beneath the line down to the bottom of the canvas
      const fillGradient = ctx.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= 10; i++) {
        fillGradient.addColorStop(i / 10, getColor(0.5, i / 10));
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cxp = (prev.x + curr.x) / 2;
        const cyp = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cxp, cyp);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = fillGradient;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cxp = (prev.x + curr.x) / 2;
        const cyp = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cxp, cyp);
      }
      ctx.strokeStyle = fillGradient;
      ctx.lineWidth = 3;
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = getColor(0.8, 0.5);
      ctx.stroke();
      ctx.restore();
    };

    // Draws a drifting field of particles across the whole canvas, each
    // tied to a fixed frequency bin, giving an atmospheric, less
    // structured "cosmic dust" look.
    const drawStarfield = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const currentSensitivity = sensitivityRef.current;
      const currentSize = particleSizeRef.current;
      const n = frameData.length;

      if (!starsRef.current) {
        const count = 140;
        starsRef.current = Array.from({ length: count }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          freqIndex: Math.floor(Math.random() * n),
          t: Math.random(),
        }));
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, w, h);

      starsRef.current.forEach((star) => {
        const value = frameData[star.freqIndex] / 255;
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x += w;
        if (star.x > w) star.x -= w;
        if (star.y < 0) star.y += h;
        if (star.y > h) star.y -= h;

        const size = currentSize * 0.5 + value * currentSensitivity * currentSize * 1.5;
        const color = getColor(value, star.t);

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4 + value * 0.6;
        ctx.beginPath();
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // Draws a classic linear spectrum analyzer: vertical bars across the
    // full width, colored bottom-to-top per bar, with a faded mirrored
    // reflection below the baseline.
    const drawSpectrum = (frameData) => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const currentSensitivity = sensitivityRef.current;
      const n = frameData.length;

      const cx = w / 2;
      const cy = h * 0.56;
      const rx = w * 0.36;
      const ry = h * 0.12;
      const maxSpike = h * 0.48;
      const points = 200;

      for (let i = 0; i < points; i++) {
        // Fold the sweep so both halves of the ellipse mirror each other,
        // producing a symmetric left/right pattern like a real 3D ring.
        const rawT = i / points;
        const foldedT = rawT <= 0.5 ? rawT * 2 : (1 - rawT) * 2;
        const binIndex = Math.min(n - 1, Math.floor(foldedT * (n - 1)));
        const value = frameData[binIndex] / 255;

        const angle = rawT * Math.PI * 2 - Math.PI / 2;
        const baseX = cx + Math.cos(angle) * rx;
        const baseY = cy + Math.sin(angle) * ry;

        // Direction follows the ellipse's outward normal: vertical at the
        // top/bottom (crown spikes), horizontal at the sides (fanned spikes).
        const dirX = Math.cos(angle) * rx;
        const dirY = Math.sin(angle) * ry;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const ndx = dirX / dirLen;
        const ndy = dirY / dirLen;

        const spikeLen = Math.max(2, value * currentSensitivity * maxSpike);
        const tipX = baseX + ndx * spikeLen;
        const tipY = baseY + ndy * spikeLen;

        const color = getColor(value, rawT);

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();

        // Thin rainbow-dotted ring tracing the ellipse base
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(baseX, baseY, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const updateFrames = () => {
      analyser.getByteFrequencyData(dataArray);
      const style = vizStyleRef.current;
      if (style === 'sphere') {
        drawSphere(dataArray);
      } else if (style === 'blob') {
        drawBlob(dataArray);
      } else if (style === 'bars') {
        drawBars(dataArray);
      } else if (style === 'wave') {
        drawWave(dataArray);
      } else if (style === 'starfield') {
        drawStarfield(dataArray);
      } else if (style === 'spectrum') {
        drawSpectrum(dataArray);
      } else {
        drawRadial(dataArray);
      }
      requestAnimationFrame(updateFrames);
    };

    sourceRef.current.start(0);
    updateFrames();

    setIsPlaying(true);
  };

  useEffect(() => {
    return () => {
      const canvas = document.getElementById('visualizerCanvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && sourceRef.current) {
        sourceRef.current.stop();
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== 'closed'
        ) {
          audioContextRef.current.close();
        }
        setIsPlaying(false);
      }
    };
  }, [isPlaying]);

  return (
    <div>
      <div
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: '10px',
          paddingTop: '60px',
          paddingBottom: '30px',
          background: 'radial-gradient(circle at 50% 30%, #1c1c28, #0d0d14)',
          borderRadius: '20px',
          maxWidth: '500px',
        }}
      >
        {isPlaying ? (
          <button className="btn" onClick={() => togglePlay()}>
            <div className="flex">
              <div className="blob white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="32"
                  fill="#fff"
                  className="bi bi-pause-fill"
                  viewBox="2 0 13 9"
                >
                  <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
                </svg>
              </div>
              <div className="btn-label">Stop</div>
            </div>
          </button>
        ) : (
          <button className="btn" onClick={() => togglePlay()}>
            <div className="flex">
              <div className="blob white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="32"
                  fill="#fff"
                  className="bi bi-play-fill"
                  viewBox="0 0 14 8"
                >
                  <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                </svg>
              </div>
              <div className="btn-label">Start</div>
            </div>
          </button>
        )}

        <div style={{ paddingTop: '30px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas id="visualizerCanvas" width="460" height="460" style={{ display: 'block' }}></canvas>
            {vizStyle === 'bars' && (
              <button
                onClick={() => togglePlay()}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" fill="#fff" viewBox="2 0 13 9">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="24" fill="#fff" viewBox="0 0 14 8">
                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                  </svg>
                )}
                <span style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#fff', opacity: 0.6 }}>
                  {isPlaying ? 'Pause' : 'Play'}
                </span>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: '#1a1a24',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#fff',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '8px' }}>
              Visualization Style
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setVizStyle(s)}
                  style={{
                    flex: '1 1 30%',
                    minWidth: '110px',
                    padding: '8px 0',
                    borderRadius: '8px',
                    border: vizStyle === s ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.12)',
                    background: vizStyle === s ? 'rgba(232, 146, 124, 0.15)' : '#242430',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '6px' }}>
              Sensitivity
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: ACCENT }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '6px' }}>
              Particle Size
            </label>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={particleSize}
              onChange={(e) => setParticleSize(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: ACCENT }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicVisualizer;
