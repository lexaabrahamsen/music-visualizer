import React, { useState, useEffect, useRef } from 'react';

const Visualizer = () => {
  const [audioContext, setAudioContext] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize the audio context when the component mounts
    if (!audioContext) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(context);
    }

    return () => {
      // Clean up the audio context when the component unmounts
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  const initializeAudioContext = () => {
    if (audioContext) {
      const source = audioContext.createMediaElementSource(audioRef.current);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 256;

      // Your visualizer logic goes here

      // Start playing the audio
      audioRef.current.play();
    }
  };

  const handleStartClick = () => {
    if (!audioContext) {
      initializeAudioContext();
    } else {
      audioRef.current.paused ? audioContext.resume() : audioContext.suspend();
    }
  };

  return (
    <div className="App">
      <header>
        <h1>React Audio Visualizer</h1>
      </header>
      <span>(Click page to start/stop)</span>
      <main>
        <button className="contextButton" onClick={handleStartClick} style={{ width: '100px', height: '25px', backgroundColor: 'yellow' }}>
          <audio ref={audioRef} className="audio" src="your-audio-source.mp3" />
        </button>
      </main>
    </div>
  );
};

export default Visualizer;
