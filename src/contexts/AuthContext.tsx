import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types/database';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, nom: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock database - In production, this would be replaced with real database
const mockUsers: User[] = [
  {
    id: '1',
    email: 'claire@manufacturing.com',
    password: 'password123',
    nom: 'Claire Martin'
  },
  {
    id: '2',
    email: 'jean@manufacturing.com',
    password: 'password123',
    nom: 'Jean Dupont'
  },
  {
    id: '3',
    email: 'marie@manufacturing.com',
    password: 'password123',
    nom: 'Marie Dubois'
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const register = async (email: string, password: string, nom: string): Promise<boolean> => {
    // Check if user already exists
    if (mockUsers.find(u => u.email === email)) {
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password,
      nom
    };

    mockUsers.push(newUser);
    setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    users: mockUsers,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};