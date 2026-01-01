import { downloadFile } from './download';
import { buildExportFilename } from './naming';

export const exportJson = (themeName, suffix = '', obj = {}, options = {}) => {
  const filename = buildExportFilename(themeName, suffix, 'json', options);
  const data = JSON.stringify(obj ?? {}, null, 2);
  downloadFile({ data, filename, mime: 'application/json' });
};

export const exportAssets = ({ data, filename, mime = 'application/octet-stream' } = {}) => {
  if (!data || !filename) return;
  downloadFile({ data, filename, mime });
};

export const exportThemePack = ({ data, filename, mime = 'application/octet-stream' } = {}) => {
  if (!data || !filename) return;
  downloadFile({ data, filename, mime });
};

export { downloadFile } from './download';
export { sanitizeFilename, slugifyFilename, buildExportFilename } from './naming';
