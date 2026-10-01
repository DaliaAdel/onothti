import { environment } from '../../environments/environment';

export function mediaUrl(path?: string | null): string {
  if (!path) {
    return '';
  }
  if (/^(https?:|blob:|data:)/i.test(path)) {
    return path;
  }
  const origin = environment.apiUrl.replace(/\/api\/?$/, '');
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
