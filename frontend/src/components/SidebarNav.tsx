import { routes } from "../data/training";
import type { AppRoute } from "../types";

type Props = {
  route: AppRoute;
  onRouteChange: (route: AppRoute) => void;
};

export function SidebarNav({ route, onRouteChange }: Props) {
  return (
    <aside className="sidebar">
      <nav className="side-nav">
        {routes.map((item) => (
          <button
            key={item.key}
            className={`nav-btn ${route === item.key ? "active" : ""}`}
            onClick={() => onRouteChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
