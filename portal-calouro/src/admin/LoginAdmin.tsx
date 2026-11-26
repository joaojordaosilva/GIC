import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiAdmin } from './apiAdmin';

interface LoginAdminProps {
  onLoginSucesso: () => void;
  onVoltarSite: () => void;
}

export default function LoginAdmin({ onLoginSucesso, onVoltarSite }: LoginAdminProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email.trim() || !senha.trim()) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }

    setEnviando(true);
    try {
      await apiAdmin.login(email.trim(), senha);
      onLoginSucesso();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="gic-login">
      <style>{`
        .gic-login {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Montserrat', Arial, sans-serif;
          background:
            radial-gradient(rgba(255, 255, 255, 0.1) 1.2px, transparent 1.4px) 0 0 / 28px 28px,
            linear-gradient(115deg, #003a7d 0%, #0056b3 55%, #1a76d2 100%);
        }
        .gic-login * { box-sizing: border-box; }
        .gic-login__card {
          width: min(420px, 100%);
          background: #ffffff;
          border-radius: 16px;
          padding: 32px 28px;
          box-shadow: 0 24px 60px rgba(0, 20, 60, 0.35);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .gic-login__brand { display: flex; align-items: center; gap: 10px; }
        .gic-login__badge {
          background: #e0a82e;
          color: #1d2b44;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.06em;
          padding: 6px 10px;
          border-radius: 8px;
        }
        .gic-login__card h1 { margin: 0; font-size: 21px; font-weight: 800; color: #004085; }
        .gic-login__sub { margin: -10px 0 0; font-size: 13.5px; color: #5a6578; line-height: 1.5; }
        .gic-login__field { display: flex; flex-direction: column; gap: 6px; }
        .gic-login__field label { font-size: 13px; font-weight: 700; color: #1d2b44; }
        .gic-login__field input {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid #d9dfea;
          border-radius: 10px;
          font: 500 14.5px 'Montserrat', Arial, sans-serif;
          color: #1d2b44;
          outline: none;
        }
        .gic-login__field input:focus { border-color: #0056b3; }
        .gic-login__erro {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          background: #fdeceb;
          border: 1px solid #f0c4c0;
          color: #b42318;
          font-size: 13px;
          font-weight: 600;
        }
        .gic-login__btn {
          width: 100%;
          min-height: 46px;
          border: none;
          border-radius: 999px;
          background: #0056b3;
          color: #ffffff;
          font: 700 15px 'Montserrat', Arial, sans-serif;
          cursor: pointer;
        }
        .gic-login__btn:hover { background: #004085; }
        .gic-login__btn:disabled { opacity: 0.7; cursor: wait; }
        .gic-login__voltar {
          background: transparent;
          border: 1px solid #d9dfea;
          border-radius: 999px;
          min-height: 42px;
          width: 100%;
          color: #5a6578;
          font: 600 14px 'Montserrat', Arial, sans-serif;
          cursor: pointer;
        }
        .gic-login__voltar:hover { background: #f4f4f9; color: #004085; border-color: #0056b3; }
      `}</style>

      <form className="gic-login__card" onSubmit={handleSubmit} noValidate>
        <div className="gic-login__brand">
          <span className="gic-login__badge">GIC</span>
          <h1>Área Administrativa</h1>
        </div>
        <p className="gic-login__sub">
          Entre com suas credenciais para gerenciar o conteúdo do portal.
        </p>

        <div className="gic-login__field">
          <label htmlFor="adm-email">E-mail institucional</label>
          <input
            id="adm-email"
            type="email"
            placeholder="seu.email@ic.ufal.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="gic-login__field">
          <label htmlFor="adm-senha">Senha</label>
          <input
            id="adm-senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {erro && <p className="gic-login__erro" role="alert">{erro}</p>}

        <button type="submit" className="gic-login__btn" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar no painel'}
        </button>

        <button type="button" className="gic-login__voltar" onClick={onVoltarSite}>
          ← Voltar ao GIC
        </button>
      </form>
    </div>
  );
}