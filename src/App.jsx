import GreLinesApp from "./components/GreLinesApp";
import GreGoApp from "./components/GreGoApp";
import HomePage from "./components/HomePage";

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  if (path === "/grelines" || path === "/grelines/validation") return <GreLinesApp />;
  if (path === "/grego" || path === "/grego/validation") return <GreGoApp />;
  return <HomePage />;
}