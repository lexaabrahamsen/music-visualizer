import React, { useEffect, useRef, useState } from 'react';
// import './stylesheet.css'; // Import your stylesheet

const VizualizerRound2 = () => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const [userClicked, setUserClicked] = useState(false);

  useEffect(() => {
    const audio1 = new Audio('https://codehs.com/uploads/8179d3793582c02c44438d0160d6f0a5');
    audio1.src = 'tune.mp3';

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioSource = audioCtx.createMediaElementSource(audio1);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;

    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const barWidth = canvas.width / analyser.frequencyBinCount;

    let x = 0;
    function animate() {
      x = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const barHeight = dataArray[i];
        ctx.fillStyle = 'white';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth;
      }

      requestAnimationFrame(animate);
    }

    if (userClicked) {
      audio1.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
      animate();
    }

    // Cleanup on component unmount
    return () => {
      audio1.pause();
      audio1.currentTime = 0;
      analyser.disconnect();
      audioSource.disconnect();
    };
  }, [userClicked]);

  return (
    <div id="container">
      <canvas ref={canvasRef}></canvas>
      <audio ref={audioRef}></audio>
      {!userClicked && (
        <button onClick={() => setUserClicked(true)}>Play Audio</button>
      )}
    </div>
  );
};

export default VizualizerRound2;
