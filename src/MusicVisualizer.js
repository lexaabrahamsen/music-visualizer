import React, { useState, useEffect, useRef } from 'react';

const THEMES = ['rainbow', 'aqua', 'sunset'];

function getColor(theme, value, t) {
  const lightness = 45 + value * 25;
  if (theme === 'rainbow') {
    return `hsl(${Math.round(t * 360)}, 90%, ${lightness}%)`;
  }
  if (theme === 'sunset') {
    const hue = (330 + t * 60) % 360;
    return `hsl(${hue}, 85%, ${lightness}%)`;
  }
  // aqua
  const hue = 175 + t * 40;
  return `hsl(${hue}, 80%, ${lightness}%)`;
}

const MusicVisualizer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [particleSize, setParticleSize] = useState(3);
  const [theme, setTheme] = useState('rainbow');

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const rotationRef = useRef(0);

  // Refs mirror the live control state so the animation loop (captured once
  // per play session) always reads the current values instead of stale ones.
  const sensitivityRef = useRef(sensitivity);
  const particleSizeRef = useRef(particleSize);
  const themeRef = useRef(theme);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);
  useEffect(() => {
    particleSizeRef.current = particleSize;
  }, [particleSize]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

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
    // faint web of lines, colored by the selected theme and driven by the
    // current sensitivity/particle-size controls.
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
      const currentTheme = themeRef.current;

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
        const color = getColor(currentTheme, p.value, p.t);
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

    const updateFrames = () => {
      analyser.getByteFrequencyData(dataArray);
      drawRadial(dataArray);
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
          backgroundImage: `url(../MusicVizualizerHomepageTopShadow.jpg)`,
          borderRadius: '20px',
          backgroundSize: 'cover',
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
          <canvas id="visualizerCanvas" width="460" height="460"></canvas>
        </div>

        <div
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#fff',
            textAlign: 'left',
          }}
        >
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
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
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
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '8px' }}>
              Color Theme
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: '8px',
                    border: theme === t ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                    background: theme === t ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: '#fff',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicVisualizer;
