import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

type User = { id: string; email: string; role: string; full_name: string };
type Ctx = { user: User | null; login: (e:string,p:string)=>Promise<void>; logout: ()=>void; loading: boolean };
const AuthCtx = createContext<Ctx>({} as any);

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) setUser(JSON.parse(u));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
