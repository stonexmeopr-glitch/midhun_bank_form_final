import React, { useState } from 'react';
import { AuthUser } from '../types';
import {
  Landmark,
  Shield,
  AlertCircle,
  LogIn,
  ArrowRight,
  CheckCircle2,
  Lock,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmailPassword,
  registerWithEmailPassword,
} from '../services/firebaseAuth';

export interface LastSubmittedInfo {
  applicationId: string;
  name?: string;
  email?: string;
}

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  lastSubmittedInfo?: LastSubmittedInfo | null;
  onClearSubmittedInfo?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  lastSubmittedInfo,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [usePassword, setUsePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; link?: string; linkText?: string } | null>(null);

  const handleGooglePopupSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await signInWithGoogle();
      if (res && res.user) {
        onLoginSuccess(res.user);
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('Google Popup auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setError({
          message: `Domain not authorized in Firebase (${currentHost}). To authorize: Go to Firebase Console > Authentication > Settings > Authorized Domains and add this domain.`,
          link: 'https://console.firebase.google.com/project/pbatu-5e9d1/authentication/settings',
          linkText: 'Open Firebase Authorized Domains Settings',
        });
      } else if (code === 'auth/popup-blocked') {
        setError({
          message: 'The sign-in popup was blocked by browser or preview sandbox. Please enable popups or use the email form below.',
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setError({
          message: 'Sign-in cancelled: The Google popup was closed before completion.',
        });
      } else if (code === 'auth/operation-not-allowed') {
        setError({
          message: 'Google Sign-In provider is not enabled in your Firebase Project (pbatu-5e9d1). In Firebase Console, go to Authentication > Sign-in method and enable Google.',
          link: 'https://console.firebase.google.com/project/pbatu-5e9d1/authentication/providers',
          linkText: 'Enable Google in Firebase Console',
        });
      } else {
        setError({
          message: err?.message || 'Google Sign-In could not be completed. You can use the email form below to proceed.',
        });
      }
    }

    setIsLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError({ message: 'Please enter a valid email address (e.g. name@gmail.com)' });
      return;
    }

    setIsLoading(true);
    setError(null);

    // If user provided a password, authenticate through Firebase Auth
    if (usePassword && passwordInput) {
      try {
        let user: AuthUser;
        if (authMode === 'register') {
          user = await registerWithEmailPassword(cleanEmail, passwordInput, nameInput.trim());
        } else {
          user = await signInWithEmailPassword(cleanEmail, passwordInput);
        }
        onLoginSuccess(user);
        setIsLoading(false);
        return;
      } catch (fbErr: any) {
        const code = fbErr?.code || '';
        if (code === 'auth/operation-not-allowed') {
          setError({
            message: 'Email/Password provider is not yet enabled in Firebase (pbatu-5e9d1). Please enable "Email/Password" in Firebase Console > Authentication > Sign-in method.',
            link: 'https://console.firebase.google.com/project/pbatu-5e9d1/authentication/providers',
            linkText: 'Enable Email/Password in Firebase Console',
          });
          setIsLoading(false);
          return;
        } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          setError({
            message: 'No account found with this email/password. Toggle to "Register New Account" or sign in without password.',
          });
          setIsLoading(false);
          return;
        } else if (code === 'auth/email-already-in-use') {
          setError({
            message: 'This email is already registered. Please enter your existing password to sign in.',
          });
          setAuthMode('signin');
          setIsLoading(false);
          return;
        } else if (code === 'auth/weak-password') {
          setError({ message: 'Password should be at least 6 characters long.' });
          setIsLoading(false);
          return;
        } else {
          setError({ message: fbErr?.message || 'Firebase authentication failed.' });
          setIsLoading(false);
          return;
        }
      }
    }

    // Direct access fallback (instant applicant profile)
    const derivedName = nameInput.trim() || cleanEmail.split('@')[0];
    const user: AuthUser = {
      name: derivedName,
      email: cleanEmail,
      provider: 'google',
      id: `agent_${Date.now()}`,
      photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        derivedName
      )}&backgroundColor=8B9A6E&textColor=ffffff`,
    };

    setTimeout(() => {
      onLoginSuccess(user);
      setIsLoading(false);
    }, 150);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-[480px] bg-white border-t-[5px] border-t-[#8B9A6E] border border-gray-200 shadow-xl rounded-sm p-6 sm:p-8">
        {/* Union Emblem & Header */}
        <div className="text-center pb-5 border-b border-gray-200">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#8B9A6E] text-white mb-2.5 shadow-sm">
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900">
            Proposed Banking Agents Trade Union
          </h1>
          <p className="text-xs font-bold text-[#5c6a43] uppercase tracking-wider mt-1">
            Membership Application Portal
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 rounded text-[11px] font-semibold text-neutral-700 border border-neutral-200">
              <Shield className="w-3.5 h-3.5 text-[#8B9A6E]" />
              <span>Firebase Authentication Active (pbatu-5e9d1)</span>
            </div>
          </div>
        </div>

        {/* Submission Feedback - Reference Number and Message Only */}
        {lastSubmittedInfo && (
          <div className="mt-5 p-4 bg-[#f8faf4] border-2 border-[#8B9A6E] rounded-md text-center space-y-2">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-[#8B9A6E] text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                Application Reference Number
              </span>
              <span className="font-mono text-lg sm:text-xl font-black text-neutral-900 tracking-wide">
                {lastSubmittedInfo.applicationId}
              </span>
            </div>
            <p className="text-sm font-semibold text-neutral-800">
              We will get back to you.
            </p>
          </div>
        )}

        {/* Authentication Body */}
        <div className="pt-5">
          <div className="mb-4 text-center">
            <h2 className="text-base font-bold text-neutral-900">Sign In to Continue</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Authenticate via Firebase using Google or your email credentials.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-300 rounded text-xs text-red-900 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block font-bold text-red-800">Authentication Note:</strong>
                <p className="mt-0.5">{error.message}</p>
                {error.link && (
                  <a
                    href={error.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 font-bold text-[#44522c] underline hover:text-[#2d381c]"
                  >
                    <span>{error.linkText || 'Open Firebase Console'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Official Google Sign-In Button */}
          <button
            type="button"
            id="googleSignInBtn"
            disabled={isLoading}
            onClick={handleGooglePopupSignIn}
            className="w-full relative flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 font-medium text-sm border border-neutral-300 rounded-md shadow-2xs transition-all duration-150 cursor-pointer hover:border-[#8B9A6E] group disabled:opacity-75"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-neutral-800">
              {isLoading ? 'Authenticating...' : 'Sign in with Google (Firebase)'}
            </span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-neutral-400 font-medium">Or enter email details</span>
            </div>
          </div>

          {/* Email entry form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="loginEmail" className="block text-xs font-bold text-neutral-800 mb-1">
                Applicant Email Address: <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="loginEmail"
                required
                placeholder="Enter your email (e.g. name@gmail.com)"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
              />
            </div>

            <div>
              <label htmlFor="loginName" className="block text-xs font-bold text-neutral-800 mb-1">
                Full Name:
              </label>
              <input
                type="text"
                id="loginName"
                placeholder="Applicant Full Name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
              />
            </div>

            {/* Optional Firebase Password Mode Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setUsePassword(!usePassword)}
                className="text-xs text-[#55673d] hover:text-[#3d4b29] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{usePassword ? 'Hide Firebase Password Field' : 'Use Firebase Password Authentication'}</span>
              </button>
            </div>

            {usePassword && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#8B9A6E]" />
                    <span>Firebase Password:</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                        authMode === 'signin'
                          ? 'bg-[#8B9A6E] text-white font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                        authMode === 'register'
                          ? 'bg-[#8B9A6E] text-white font-bold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>
                <input
                  type="password"
                  id="loginPassword"
                  placeholder={authMode === 'register' ? 'Choose a password (min 6 chars)' : 'Enter your password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#8B9A6E] text-white hover:bg-[#78875c] active:bg-[#66744d] text-sm font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Authenticating...'
                  : usePassword
                  ? authMode === 'register'
                    ? 'Register with Firebase'
                    : 'Sign In with Firebase'
                  : 'Continue to Application Form'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Duplicate protection rule note */}
          <div className="mt-5 pt-3.5 border-t border-neutral-200 text-center text-[11px] text-neutral-500 leading-normal flex items-center justify-center gap-1.5">
            <span>Duplicate Protection Active: Each Email ID and Mobile Number can only be submitted once.</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-neutral-500">
        Proposed Banking Agents Trade Union • Firebase Project: pbatu-5e9d1
      </div>
    </div>
  );
};
