import './App.css';
import React from 'react';
import MusicVisualizer from './MusicVisualizer';

function App() {
  return (
    <div className="App" style={{ backgroundColor: '#0d0d14', minHeight: '100vh', paddingTop: '50px', paddingBottom: '50px' }}>
      <MusicVisualizer />
    </div>
  );
}

export default App;
