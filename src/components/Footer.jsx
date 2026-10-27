import React from 'react';
import { useTransit } from '../context/TransitContext';

export default function Footer() {
  const { t } = useTransit();

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <span style={{ color: '#22c55e', fontSize: '10px' }}>●</span>
        <span>{t.footerNotice}</span>
      </div>
      <div className="footer-right">
        <span>{t.footerDataSource}</span>
        <span style={{ color: '#94A3B8' }}>{t.footerVersion}</span>
      </div>
    </footer>
  );
}
