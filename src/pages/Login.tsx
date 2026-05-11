import React from "react";
import { loginWithGoogle } from "../lib/firebase";

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900 font-sans">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6 text-white text-xl font-bold">
          M
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-2">Modarnet Rental</h1>
        <p className="text-xs text-slate-500 mb-8">Sign in to manage your laptop rental requests.</p>
        <button 
          onClick={loginWithGoogle} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    </div>
  );
};
