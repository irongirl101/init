import { defineConfig } from "vite";
import dotenv from 'dotenv';
import tailwindcss from "@tailwindcss/vite";
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import glob from 'fast-glob';
import { processImages } from './src/image-preprocess.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, '/assets/images');
const outputDir = path.join(__dirname, '/assets/images-processed');
const siteConfigPath = path.join(__dirname, 'config.yaml');
const requirementsPath = path.join(__dirname, 'requirements.txt');

const loadSiteConfig = () => {
  try {
    const raw = fs.readFileSync(siteConfigPath, 'utf8');
    return YAML.parse(raw) || {};
  } catch (err) {
    console.error('[config] Unable to read config.yaml', err);
    return {};
  }
};


// Image processing moved to defineConfig


if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
}

const sanitizeExecutable = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

// function moved up

const resolvePythonExecutable = () => {
  const envOverride = sanitizeExecutable(process.env.PY_EXECUTABLE);
  if (envOverride) {
    return envOverride;
  }

  const venvPythonBin = path.join(__dirname, '.venv/bin/python');
  const venvPythonScripts = path.join(__dirname, '.venv/Scripts/python.exe');
  
  if (process.platform === 'win32') {
    if (fs.existsSync(venvPythonScripts)) return venvPythonScripts;
  } else {
    if (fs.existsSync(venvPythonBin)) return venvPythonBin;
  }
  
  // Fallback check regardless of platform prediction (e.g. mingw/cygwin)
  if (fs.existsSync(venvPythonBin)) return venvPythonBin;
  if (fs.existsSync(venvPythonScripts)) return venvPythonScripts;

  const siteConfig = loadSiteConfig();
  const runtimeConfig = siteConfig && typeof siteConfig === 'object' ? siteConfig.runtime : null;

  const candidates = [
    runtimeConfig && runtimeConfig.python_executable,
    runtimeConfig && runtimeConfig.python,
    runtimeConfig && runtimeConfig.interpreter,
    siteConfig && siteConfig.python_executable,
    siteConfig && siteConfig.python,
  ];

  for (const candidate of candidates) {
    const value = sanitizeExecutable(candidate);
    if (value) {
      return value;
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3';
};

let pythonExecutable = resolvePythonExecutable();
console.log(`[config] Using Python executable: ${pythonExecutable}`);

const ensurePythonRequirements = () => {
  const venvPath = path.join(__dirname, '.venv');
  const isWindows = process.platform === 'win32';
  
  const venvPython = isWindows 
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');

  const venvPip = isWindows
    ? path.join(venvPath, 'Scripts', 'pip.exe')
    : path.join(venvPath, 'bin', 'pip');

  if (!fs.existsSync(venvPath)) {
    console.log('Creating python virtual environment...');
    try {
      execSync(`"${pythonExecutable}" -m venv "${venvPath}"`, { stdio: 'inherit' });
      pythonExecutable = venvPython;
    } catch (e) {
      console.error('Failed to create virtual environment.', e);
      return;
    }
  }

  try {
    console.log('Installing python dependencies...');

    execSync(`"${venvPip}" install -r "${requirementsPath}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to install Python dependencies.', e);
  }
};

const runGenerateStyles = () => {
  try {
    const output = execSync(`"${pythonExecutable}" src/main.py --generate-styles`);
    const text = output.toString().trim();
    if (text) {
      console.log(text);
    }
  } catch (e) {
    console.error('[styles] failed to generate theme/font CSS.', e);
  }
};

const refreshPythonExecutable = () => {
  const resolved = resolvePythonExecutable();
  if (resolved !== pythonExecutable) {
    console.log(`[config] Python executable updated to: ${resolved}`);
    pythonExecutable = resolved;
    ensurePythonRequirements();
  } else {
    pythonExecutable = resolved;
  }
  return pythonExecutable;
};

ensurePythonRequirements();
runGenerateStyles();

const handleExit = () => {
  console.log('\nCleaning up build files...');
  try {
    const output = execSync(`"${pythonExecutable}" src/main.py --clean`);
    console.log(output.toString().trim());
  } catch (e) {
    console.error("Cleanup script failed:", e);
  }
  process.exit();
};

// Ensure we only attach the listener once
if (!process.listenerCount('SIGINT')) {
  process.on('SIGINT', handleExit);
}

const py_build_plugin = () => {
  let ready = false;

  return {
    name: 'builder-ssg',
    closeBundle() {
      console.log('Cleaning up root directory...');
      try {
        const output = execSync(`"${pythonExecutable}" src/main.py --clean`);
        console.log(output.toString().trim());
      } catch (e) {
        console.error('Failed to cleanup:', e);
      }
    },
    configureServer(server) {
      const regenerateGeneratedCss = () => {
        runGenerateStyles();
      };

      const build = (file = null) => {
        const command = file
          ? `"${pythonExecutable}" src/main.py --file ${file}`
          : `"${pythonExecutable}" src/main.py`;

        try {
          const output = execSync(command);
          console.log(output.toString().trim());

          server.ws.send({ type: 'full-reload', path: "*" });
          ready = true;
        } catch (e) {
          console.error("Script failed to update: ", e);
        }
      };

      build();

      server.watcher.on('all', async (event, filePath) => {
        if (!ready) {
          return;
        }

        if (filePath.endsWith('config.yaml')) {
          refreshPythonExecutable();
          regenerateGeneratedCss();
          build();
          return;
        }

        if (filePath.includes('/content/') || filePath.includes('/templates/')) {
          if (event === 'change') {
            const buildTarget = filePath.includes('/templates/') ? null : filePath;
            build(buildTarget);
          } else if (event === 'add' || event === 'unlink') {
            build();
          }
        }
        if (filePath.includes('/assets/images/')) {
             if (event === 'add' || event === 'change' || event === 'unlink') {
                 console.log(`[watcher] Image change detected: ${event} ${filePath}`);
                 try {
                     const siteConfig = loadSiteConfig();
                     await processImages(inputDir, outputDir, siteConfig);
                     build();
                 } catch (e) {
                     console.error('[watcher] Image processing failed', e);
                 }
             }
        }
        if (event === 'change' && filePath.includes('/assets/css/')) {
          build();
        }
        if (event === 'unlink') {
          if (!filePath.includes('/assets/images/')) {
              build();
          }
        }
      });
    },
  };
};

export default defineConfig(async ({ command }) => {
  try {
    const siteConfig = loadSiteConfig();
    await processImages(inputDir, outputDir, siteConfig);
  } catch (e) {
    console.error('[images] processing failed', e);
  }

  if (command === 'build') {
    console.log('Buiding static pages for production');
    try {
      const output = execSync(`${pythonExecutable} src/main.py`);
      console.log(output.toString().trim());
    } catch (e) {
      console.error('Failed to generate static files:', e);
      throw e;
    }
  }

  const inputFiles = glob.sync(['**/*.html', '!dist/**', '!node_modules/**', '!**/.venv/**', '!templates/**']);

  return {
    plugins: [
      py_build_plugin(),
      tailwindcss(),
    ],
    build: {
      outDir: './dist',
      rollupOptions: {
        input: inputFiles,
      },
    },
    server: {
      watch: {
        ignored: (p) => {
          const relPath = path.relative(__dirname, p).replace(/\\/g, '/');
          if (!relPath || relPath === '.') return false;
          if (relPath.startsWith('..')) return true;

          const whitelisted = ['templates', 'content', 'assets', 'config.yaml', 'vite.config.mjs'];
          const isWhitelisted = whitelisted.some(base => relPath === base || relPath.startsWith(base + '/'));
          
          if (isWhitelisted) {
            const isGeneratedCss = [
              'assets/css/generated.daisyui.css',
              'assets/css/generated.fonts.css',
              'assets/css/syntax.css'
            ].some(gen => relPath === gen);
            
            return isGeneratedCss;
          }
          
          return true;
        }
      }
    }
  };
});
