import { useState } from 'react';
import LoginAdmin from './LoginAdmin';
import PainelAdmin from './PainelAdmin';

const AUTH_KEY = 'gic_admin_autenticado';

interface AreaAdminProps {
  onVoltarSite: () => void;
}

export default function AreaAdmin({ onVoltarSite }: AreaAdminProps) {
  const [logado, setLogado] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_KEY, '1');
    setLogado(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setLogado(false);
  };

  if (!logado) {
    return <LoginAdmin onLoginSucesso={handleLogin} onVoltarSite={onVoltarSite} />;
  }

  return <PainelAdmin onVoltarSite={onVoltarSite} onLogout={handleLogout} />;
}