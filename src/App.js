import './App.css';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Visualizer from './Visualizer';
import VizualizerRoundTwo from './VizualizerRoundTwo';
import VizualizerRound3 from './VizualizerRound3';
import Visualizer4 from './MusicVisualizer';
import MusicVisualizer from './MusicVisualizer';
import ItsTheNew from './ItsTheNew';

function App() {
  return (
    <div className="App"
    style={{
      backgroundImage: `url(../MusicVizualizerHomepage.jpg)`,
      // backgroundColor: 'yellow',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    >
      <h1>React App</h1>
      {/* <MusicVisualizer /> */}
      {/* <Visualizer4 /> */}
      {/* <VizualizerRoundTwo /> */}
      {/* <VizualizerRound3 /> */}
      {/* <Visualizer /> */}
      <ItsTheNew />
    </div>
  );
}

export default App;
