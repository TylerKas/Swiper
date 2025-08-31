import React from 'react';
// TODO: Replace with Firebase auth imports
// import { auth } from '@/firebase/config';

interface AuthContextType {
  user: any | null; // TODO: Replace with Firebase User type
  session: any | null; // TODO: Replace with Firebase session type
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<any | null>(null);
  const [session, setSession] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Replace with Firebase auth state listener
    // const unsubscribe = onAuthStateChanged(auth, (user) => {
    //   setUser(user);
    //   setSession(user ? { user } : null);
    //   setLoading(false);
    // });
    // return unsubscribe;
    
    // Temporary: Set loading to false to prevent infinite loading
    setLoading(false);
  }, []);

  const signOut = async () => {
    // TODO: Replace with Firebase signOut
    // await signOut(auth);
    console.log('Sign out functionality will be implemented with Firebase');
  };

  const value = {
    user,
    session,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};