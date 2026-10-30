import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister, updateProfile as apiUpdateProfile, getCsrf } from "../api/auth.js";
import { AuthContext } from "./authContextDef.js";

export { AuthContext };

const EMPLOYEE_ROLES = ["STAFF", "FIELD_STAFF", "DEPARTMENT_OFFICER", "SUPERVISOR"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      await getCsrf();
      const me = await getCurrentUser();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    await getCsrf();
    const res = await apiLogin(email, password);
    const userData = res.user || res;
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    await getCsrf();
    const res = await apiRegister(name, email, password);
    const userData = res.user || res;
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (name) => {
    const res = await apiUpdateProfile(name);
    setUser((prev) => (prev ? { ...prev, name } : prev));
    return res;
  };

  const isCitizen = user?.role === "CITIZEN";
  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role && EMPLOYEE_ROLES.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        isCitizen,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
