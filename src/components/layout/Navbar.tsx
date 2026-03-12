import { useLocation, useNavigate } from "react-router-dom";
import { Calculator as CalcIcon } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-border px-4 py-0 sticky top-0 z-20 shadow-sm no-print">
      <div className="mx-auto w-full max-w-[800px] flex items-center h-16 gap-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalcIcon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-sans font-bold tracking-tight text-foreground hidden sm:block">
            Liquidación de Comisiones
          </h1>
        </div>
        
        <div className="flex-1" />
        
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate("/")}
            className={`px-3 sm:px-4 py-2 text-sm font-sans font-medium rounded-md transition-all duration-300 ${
              location.pathname === "/" 
                ? "bg-secondary text-secondary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            Calculadora
          </button>
          <button
            onClick={() => navigate("/historial")}
            className={`px-3 sm:px-4 py-2 text-sm font-sans font-medium rounded-md transition-all duration-300 ${
              location.pathname === "/historial" 
                ? "bg-secondary text-secondary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => navigate("/configuracion")}
            className={`px-3 sm:px-4 py-2 text-sm font-sans font-medium rounded-md transition-all duration-300 ${
              location.pathname === "/configuracion" 
                ? "bg-secondary text-secondary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            Ajustes
          </button>
        </nav>
      </div>
    </header>
  );
}
