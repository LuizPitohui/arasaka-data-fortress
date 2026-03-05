import { useAuthStore } from "./lib/store";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}
    </>
  );
}

export default App;