import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string | number; // Allow both string and number
  is_active: boolean;
  cm_code?: string;
  cm_description?: string;
  company_name?: string;
  periods?: string;
  region_id?: number;
  srm?: string;
  signatory?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCMUser: boolean;
  isSRMUser: boolean;
  // Add helper function for flexible role checking
  checkRole: (role: string | number) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Helper function to check if user has a specific role (flexible for string/number)
  const checkRole = (targetRole: string | number): boolean => {
    if (!user?.role) return false;
    
    // Convert both to strings for comparison
    const userRoleStr = String(user.role);
    const targetRoleStr = String(targetRole);
    
    return userRoleStr === targetRoleStr;
  };

  const login = (userData: User) => {
    setUser(userData);
    // Store user data in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user;
  // Flexible role checking - works with both string and number values
  const isAdmin = checkRole('1') || checkRole(1);
  const isCMUser = checkRole('2') || checkRole(2);
  const isSRMUser = checkRole('3') || checkRole(3);

  // Debug logging for authentication status
  console.log('AuthContext Debug:', {
    user,
    userRole: user?.role,
    userRoleType: typeof user?.role,
    isAuthenticated,
    isAdmin,
    isCMUser,
    isSRMUser
  });

  // Check for existing user data on component mount
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isCMUser,
    isSRMUser,
    checkRole, // Export the helper function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 