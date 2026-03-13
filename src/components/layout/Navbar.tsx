import { useLocation, useNavigate } from "react-router-dom";
import { Calculator as CalcIcon } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-border px-4 py-0 sticky top-0 z-20 shadow-sm no-print">
      <div className="mx-auto w-full max-w-[1035px] flex flex-wrap items-center justify-between min-h-[4rem] py-2 sm:py-0 gap-y-2">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
          <div className="bg-primary/10 p-2 rounded-lg">
            <CalcIcon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-base sm:text-lg font-sans font-bold tracking-tight text-foreground truncate max-w-[180px] sm:max-w-none">
            Liquidación de Comisiones
          </h1>
        </div>
        
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate("/")}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm font-sans font-medium rounded-md transition-all duration-300 ${
              location.pathname === "/" 
                ? "bg-secondary text-secondary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            Calculadora
          </button>
          <button
            onClick={() => navigate("/historial")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm font-sans font-medium rounded-md transition-all duration-300 ${
              location.pathname === "/historial" 
                ? "bg-secondary text-secondary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => navigate("/configuracion")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm font-sans font-medium rounded-md transition-all duration-300 ${
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
