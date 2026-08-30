const APP_SOURCES = [
  'https://raw.githubusercontent.com/Clopezgg/usa-travel-compliance/cb72d515ee3e8075a8aa93eb06ff8e4d3112626f/web/app.js',
  'https://cdn.jsdelivr.net/gh/Clopezgg/usa-travel-compliance@cb72d515ee3e8075a8aa93eb06ff8e4d3112626f/web/app.js'
];

const SUPABASE_URL = 'https://hveuobccoyaqlpkgzttk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iP9MNTEU6Mz_Tnz7bqugPg_CGyo6eTf';

function showBootstrapError(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'toast error';
  }
  console.error('[EntrySafe bootstrap]', message);
}

async function loadSdk() {
  const sources = [
    'https://esm.sh/@supabase/supabase-js@2.112.4',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm'
  ];
  let lastError;
  for (const source of sources) {
    try {
      const mod = await import(source);
      if (typeof mod.createClient === 'function') return mod.createClient;
    } catch (error) {
      lastError = error;
      console.warn('[EntrySafe bootstrap] SDK source failed', source, error);
    }
  }
  throw lastError || new Error('No se pudo cargar Supabase SDK');
}

async function loadAppSource() {
  let lastError;
  for (const source of APP_SOURCES) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const text = await response.text();
      if (!text.includes('handleAuthSubmit') || !text.includes('bindStaticEvents')) {
        throw new Error('El archivo cargado no contiene el motor de EntrySafe');
      }
      return text;
    } catch (error) {
      lastError = error;
      console.warn('[EntrySafe bootstrap] App source failed', source, error);
    }
  }
  throw lastError || new Error('No se pudo cargar el motor de EntrySafe');
}

async function boot() {
  try {
    const [createClient, source] = await Promise.all([loadSdk(), loadAppSource()]);
    const code = source
      .replace(/^import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"];?\s*/m, '')
      .replace(/^import\s+\{\s*SUPABASE_URL\s*,\s*SUPABASE_PUBLISHABLE_KEY\s*\}\s+from\s+['"]\.\/config\.js['"];?\s*/m, '');

    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const run = new AsyncFunction(
      'createClient',
      'SUPABASE_URL',
      'SUPABASE_PUBLISHABLE_KEY',
      `${code}\n//# sourceURL=entrysafe-runtime.js`
    );
    await run(createClient, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    window.__ENTRYSAFE_BOOT_OK__ = true;
  } catch (error) {
    window.__ENTRYSAFE_BOOT_OK__ = false;
    showBootstrapError('No se pudo iniciar EntrySafe. Recarga la página; si continúa, el motor de acceso será reparado automáticamente.');
    console.error(error);
  }
}

boot();
