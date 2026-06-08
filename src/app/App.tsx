import { useEffect } from 'react';
import '../styles/figsmash.css';
import { mountEngine } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HudHeader } from './components/HudHeader';
import { InspectorPanel } from './components/InspectorPanel';
import { Toolbar } from './components/Toolbar';
import { ForceQuitDialog } from './components/ForceQuitDialog';
import { FigmaChrome } from './components/FigmaChrome';
import { CharacterSelect } from './components/screens/CharacterSelect';
import { CharacterArtMounts } from './components/CharacterArtMounts';
import { MapSelect } from './components/screens/MapSelect';
import { ImportDialog } from './components/screens/ImportDialog';
import { WinScreen } from './components/screens/WinScreen';
import { PauseMenu } from './components/screens/PauseMenu';
import { FigConsole } from './console/FigConsole';
import './garden/garden.css';
import './garden/shell.css';
import './garden/pixel.css';

export default function App() {
  useEffect(() => {
    // Engine queries the DOM by id and self-guards against double-init for React Strict Mode.
    mountEngine();
  }, []);

  return (
    <>
      <GameCanvas />
      <HudHeader />
      <InspectorPanel />
      <Toolbar />
      <ForceQuitDialog />
      <CharacterSelect />
      <MapSelect />
      <ImportDialog />
      <WinScreen />
      <PauseMenu />
      <FigmaChrome />
      <CharacterArtMounts />
      <FigConsole />
    </>
  );
}
