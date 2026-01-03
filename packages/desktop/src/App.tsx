import { OpenCodePanel } from './components/OpenCodePanel';
import { useOpenCode } from './hooks/useOpenCode';

function App() {
  const opencode = useOpenCode();

  return (
    <div className="app">
      <header className="app-header">
        <h1>WordForge</h1>
        <p className="subtitle">
          Forge your WordPress site through conversation
        </p>
      </header>

      <main className="app-main">
        <OpenCodePanel {...opencode} />
      </main>

      <footer className="app-footer">
        <p>
          Powered by{' '}
          <a
            href="https://opencode.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenCode
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
