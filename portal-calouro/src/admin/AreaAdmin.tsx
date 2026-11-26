import { useState } from 'react';
import LoginAdmin from './LoginAdmin';
import PainelAdmin from './PainelAdmin';
import { apiAdmin } from './apiAdmin';

interface AreaAdminProps {
  onVoltarSite: () => void;
}

export default function AreaAdmin({ onVoltarSite }: AreaAdminProps) {
  // A sessão agora é o token JWT guardado pelo apiAdmin (sessionStorage).
  // Se o token tiver expirado, o painel recebe 401 ao carregar e chama onLogout.
  const [logado, setLogado] = useState(() => apiAdmin.temSessao());

  const handleLogin = () => setLogado(true);

  const handleLogout = () => {
    apiAdmin.logout();
    setLogado(false);
  };

  if (!logado) {
    return <LoginAdmin onLoginSucesso={handleLogin} onVoltarSite={onVoltarSite} />;
  }

  return <PainelAdmin onVoltarSite={onVoltarSite} onLogout={handleLogout} />;
}
