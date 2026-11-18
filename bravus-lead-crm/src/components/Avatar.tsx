import clsx from 'clsx';
import { initials } from '../lib/format';

/** Foto do perfil (ou iniciais quando não tem foto). */
export function Avatar({ name, url, size = 44, className }: { name?: string | null; url?: string | null; size?: number; className?: string }) {
  const s = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) };
  if (url) return <img src={url} alt="" style={s} className={clsx('shrink-0 rounded-full object-cover ring-2 ring-white/10', className)} />;
  return <span style={s} className={clsx('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-cyan-400 font-bold text-white', className)}>{initials(name)}</span>;
}

/** Reduz a imagem escolhida para 256×256 (JPEG) e devolve como data URL — fica leve e não precisa de Storage. */
export function resizeImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas'); c.width = max; c.height = max;
      const ctx = c.getContext('2d'); if (!ctx) return reject(new Error('Não foi possível ler a imagem.'));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}
