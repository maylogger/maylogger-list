import type { GlobalProvider } from "@/types/ladle";

import "../app/globals.css";

export const Provider: GlobalProvider = ({ children }) => <>{children}</>;
