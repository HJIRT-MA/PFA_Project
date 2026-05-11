import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">TutorFlow</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
