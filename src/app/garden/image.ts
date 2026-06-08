/**
 * Downscale an uploaded design image to a compact dataURL so it fits in
 * localStorage (the figma.clientStorage stand-in) and can be stored alongside
 * each planted flower for later viewing.
 */
export function fileToDownscaledDataUrl(file: File, maxDim = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable.'));
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(String(reader.result));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** A tiny built-in "preloaded from the plugin" design, drawn as an SVG dataURL. */
export function pluginStubDesign(): { image: string; name: string } {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'>
    <rect width='480' height='360' fill='#F4F5F7'/>
    <rect x='0' y='0' width='480' height='56' fill='#0052CC'/>
    <circle cx='30' cy='28' r='12' fill='#fff'/>
    <rect x='54' y='20' width='120' height='16' rx='8' fill='#ffffff' opacity='0.8'/>
    <rect x='28' y='84' width='200' height='120' rx='10' fill='#FF5630'/>
    <rect x='252' y='84' width='200' height='56' rx='10' fill='#36B37E'/>
    <rect x='252' y='150' width='200' height='54' rx='10' fill='#6554C0'/>
    <rect x='28' y='224' width='424' height='18' rx='9' fill='#091E42' opacity='0.18'/>
    <rect x='28' y='256' width='320' height='18' rx='9' fill='#091E42' opacity='0.12'/>
    <rect x='28' y='300' width='160' height='36' rx='18' fill='#0052CC'/>
  </svg>`;
  return {
    image: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    name: 'Dashboard_v4_FINAL_client_edits.fig',
  };
}
