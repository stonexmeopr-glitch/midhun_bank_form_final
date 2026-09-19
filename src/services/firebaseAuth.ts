import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signInWithGoogle = async (): Promise<{
  user: AuthUser;
  accessToken?: string;
}> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || undefined;

    if (token) {
      cachedAccessToken = token;
    }

    const firebaseUser: User = result.user;
    const authUser: AuthUser = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Banking Agent Member',
      email: firebaseUser.email || 'agent@example.com',
      photoUrl: firebaseUser.photoURL || undefined,
      provider: 'google',
    };

    return { user: authUser, accessToken: token };
  } catch (error: any) {
    throw error;
  }
};

export const signInWithEmailPassword = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser: User = result.user;
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || email.split('@')[0],
    email: firebaseUser.email || email,
    photoUrl: firebaseUser.photoURL || undefined,
    provider: 'firebase',
  };
};

export const registerWithEmailPassword = async (
  email: string,
  password: string,
  name?: string
): Promise<AuthUser> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name && result.user) {
    await updateProfile(result.user, { displayName: name }).catch(() => {});
  }
  const firebaseUser: User = result.user;
  return {
    id: firebaseUser.uid,
    name: name || firebaseUser.displayName || email.split('@')[0],
    email: firebaseUser.email || email,
    photoUrl: firebaseUser.photoURL || undefined,
    provider: 'firebase',
  };
};

export const signOutGoogle = async (): Promise<void> => {
  cachedAccessToken = null;
  await fbSignOut(auth).catch(() => {});
};

