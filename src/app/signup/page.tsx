'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setCookie, saveLocalProfile } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password rules
  const isLengthValid = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordStrong = isLengthValid && hasNumber && hasLetter;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Le nom d'affichage est obligatoire.");
      return;
    }

    if (!isPasswordStrong) {
      setError("Le mot de passe ne respecte pas les critères de sécurité.");
      return;
    }

    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("Clés Supabase manquantes. Veuillez d'abord configurer vos clés de projet (p.ex. dans l'onglet de connexion).");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: displayName.trim()
          }
        }
      });

      if (signupError) throw signupError;

      // Automatically sign in or advise user
      if (data.session) {
        setCookie('devsync-db-mode', 'supabase', 30);
        setCookie('devsync-session-token', data.session.access_token, 7);
        saveLocalProfile({
          name: displayName.trim(),
          avatar: displayName.trim().charAt(0).toUpperCase()
        });
        router.push('/');
        router.refresh();
      } else {
        // Confirmation email sent
        setError("Compte créé ! Veuillez vérifier vos e-mails pour confirmer votre inscription, puis connectez-vous.");
        setDisplayName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md card-light rounded-3xl p-6 md:p-8 flex flex-col gap-6 bg-white shadow-2xl relative z-10 animate-in fade-in duration-200">
        
        {/* Title */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#161616] text-[#F2C94C] flex items-center justify-center font-display font-extrabold text-base tracking-tighter mx-auto shadow-sm select-none">
            DS
          </div>
          <h2 className="text-[26px] font-display font-bold text-[#1B1B1B] tracking-tight mt-3">
            Créer un compte
          </h2>
          <p className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] mt-1">
            Rejoindre la synchronisation Cloud
          </p>
        </div>

        {/* Error panel */}
        {error && (
          <div className="p-3.5 bg-[#FBE7A1] border border-[#ECEAE3] rounded-2xl text-[10.5px] font-mono text-[#1B1B1B] flex items-start gap-2 leading-relaxed animate-in shake duration-150">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sign-name" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Nom d&apos;affichage
            </label>
            <input
              id="sign-name"
              type="text"
              placeholder="Ex: Aymane"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sign-email" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Adresse Email
            </label>
            <input
              id="sign-email"
              type="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sign-password" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Mot de passe
            </label>
            <input
              id="sign-password"
              type="password"
              placeholder="Min. 8 caractères (lettres & chiffres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
              required
            />
            {/* Strength meter */}
            {password.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 p-2 bg-[#F7F5EF] rounded-xl border border-[#ECEAE3]">
                <div className="flex gap-3 text-[9px] font-mono text-[#8C8A85]">
                  <span className={isLengthValid ? 'text-emerald-500 font-bold' : ''}>✓ 8+ chars</span>
                  <span className={hasNumber ? 'text-emerald-500 font-bold' : ''}>✓ Chiffre</span>
                  <span className={hasLetter ? 'text-emerald-500 font-bold' : ''}>✓ Lettre</span>
                </div>
                <div className="h-1 w-full bg-[#ECEAE3] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPasswordStrong ? 'bg-emerald-500' : (isLengthValid || hasNumber || hasLetter) ? 'bg-amber-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${(isLengthValid ? 33 : 0) + (hasNumber ? 33 : 0) + (hasLetter ? 34 : 0)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sign-confirm" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Confirmer le mot de passe
            </label>
            <input
              id="sign-confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
              required
            />
            {confirmPassword.length > 0 && (
              <span className={`text-[9.5px] font-mono mt-0.5 ${passwordsMatch ? 'text-emerald-500' : 'text-red-500'}`}>
                {passwordsMatch ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordStrong || !passwordsMatch}
            className="w-full mt-2 py-2.5 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            <span>S&apos;inscrire</span>
          </button>

          {/* Login link */}
          <p className="text-center text-[11px] text-[#8C8A85] mt-1">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-[#1B1B1B] font-bold hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
