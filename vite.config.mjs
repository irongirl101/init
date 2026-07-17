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

const py_build_plugin = (baseUrl = '') => {
  let ready = false;

  return {
    name: 'builder-ssg',
    closeBundle() {
      if (process.env.NODE_ENV === 'production') {
        // For production builds, move generated files to dist before cleanup
        console.log('Moving generated files to dist...');
        try {
          const generatedDirs = ['blog', 'posts', 'tags'];
          const generatedFiles = ['index.html', 'sitemap.xml'];
          
          // Move directories from root to dist
          for (const dir of generatedDirs) {
            const src = path.join(__dirname, dir);
            const dst = path.join(__dirname, 'dist', dir);
            if (fs.existsSync(src)) {
              if (fs.existsSync(dst)) {
                fs.rmSync(dst, { recursive: true });
              }
              fs.renameSync(src, dst);
            }
          }
          
          // Move files from root to dist
          for (const file of generatedFiles) {
            const src = path.join(__dirname, file);
            const dst = path.join(__dirname, 'dist', file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dst);
              fs.unlinkSync(src);
            }
          }

          // Copy CSS files from assets/css to dist/assets/css
          const cssSrcDir = path.join(__dirname, 'assets', 'css');
          const cssDstDir = path.join(__dirname, 'dist', 'assets', 'css');
          if (fs.existsSync(cssSrcDir)) {
            if (!fs.existsSync(cssDstDir)) {
              fs.mkdirSync(cssDstDir, { recursive: true });
            }
            const cssFiles = fs.readdirSync(cssSrcDir).filter(f => f.endsWith('.css'));
            for (const cssFile of cssFiles) {
              const src = path.join(cssSrcDir, cssFile);
              const dst = path.join(cssDstDir, cssFile);
              fs.copyFileSync(src, dst);
            }
          }

          // Copy images from assets/images to dist/assets/images
          const imgSrcDir = path.join(__dirname, 'assets', 'images');
          const imgDstDir = path.join(__dirname, 'dist', 'assets', 'images');
          if (fs.existsSync(imgSrcDir)) {
            if (!fs.existsSync(imgDstDir)) {
              fs.mkdirSync(imgDstDir, { recursive: true });
            }
            const imgFiles = fs.readdirSync(imgSrcDir);
            for (const imgFile of imgFiles) {
              const src = path.join(imgSrcDir, imgFile);
              const dst = path.join(imgDstDir, imgFile);
              if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dst);
              }
            }
          }

          // Copy processed images from assets/images-processed to dist/assets/images-processed
          const procSrcDir = path.join(__dirname, 'assets', 'images-processed');
          const procDstDir = path.join(__dirname, 'dist', 'assets', 'images-processed');
          if (fs.existsSync(procSrcDir)) {
            if (!fs.existsSync(procDstDir)) {
              fs.mkdirSync(procDstDir, { recursive: true });
            }
            const procFiles = fs.readdirSync(procSrcDir);
            for (const procFile of procFiles) {
              const src = path.join(procSrcDir, procFile);
              const dst = path.join(procDstDir, procFile);
              if (fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dst);
              }
            }
          }
          
          // Post-process HTML files to point script/style to built assets
          const htmlFiles = glob.sync(path.join(__dirname, 'dist', '**/*.html'));
          const builtAssets = glob.sync(path.join(__dirname, 'dist', 'assets', '*.js'));
          const builtCss = glob.sync(path.join(__dirname, 'dist', 'assets', '*.css'));
          
          const builtMainJs = builtAssets.find(f => f.includes('main'));
          const builtMainCss = builtCss.find(f => f.includes('main'));
          
          for (const htmlFile of htmlFiles) {
            let content = fs.readFileSync(htmlFile, 'utf-8');
            let modified = false;
            
            // Replace script src="/src/topography.ts" with actual built asset
            if (builtMainJs) {
              const jsAssetName = path.basename(builtMainJs);
              const targetScript = 'src="/src/topography.ts"';
              if (content.includes(targetScript)) {
                content = content.replace(
                  targetScript,
                  `src="${baseUrl}/assets/${jsAssetName}"`
                );
                modified = true;
              }
            }

            // Inject compiled CSS link before </head>
            if (builtMainCss) {
              const cssAssetName = path.basename(builtMainCss);
              const linkTag = `<link rel="stylesheet" href="${baseUrl}/assets/${cssAssetName}">`;
              if (!content.includes(linkTag)) {
                content = content.replace(
                  '</head>',
                  `  ${linkTag}\n</head>`
                );
                modified = true;
              }
            }
            
            if (modified) {
              fs.writeFileSync(htmlFile, content, 'utf-8');
            }
          }
          
          console.log('Files moved successfully');
        } catch (e) {
          console.error('Failed to move files to dist:', e);
        }
      } else {
        // During dev mode, clean up
        console.log('Cleaning up root directory...');
        try {
          const output = execSync(`"${pythonExecutable}" src/main.py --clean`);
          console.log(output.toString().trim());
        } catch (e) {
          console.error('Failed to cleanup:', e);
        }
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
      
      // Move generated HTML files from docs to dist
      const generatedDirs = ['blog', 'posts', 'tags'];
      const generatedFiles = ['index.html', 'sitemap.xml'];
      
      // Ensure dist exists
      if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
      }
      
      // Move directories from docs to dist
      for (const dir of generatedDirs) {
        const src = path.join(__dirname, 'docs', dir);
        const dst = path.join(__dirname, 'dist', dir);
        if (fs.existsSync(src)) {
          if (fs.existsSync(dst)) {
            fs.rmSync(dst, { recursive: true });
          }
          fs.renameSync(src, dst);
        }
      }
      
      // Move files from docs to dist
      for (const file of generatedFiles) {
        const src = path.join(__dirname, 'docs', file);
        const dst = path.join(__dirname, 'dist', file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          fs.unlinkSync(src);
        }
      }
    } catch (e) {
      console.error('Failed to generate static files:', e);
      throw e;
    }
  }

  const inputFiles = glob.sync(['**/*.html', '!dist/**', '!node_modules/**', '!**/.venv/**', '!templates/**']);
  const siteConfig = loadSiteConfig();
  const baseUrl = siteConfig.base_url || '';
  
  // For production builds, use topography.ts as the only entry point since HTML is generated by Python
  const rollupInputFiles = command === 'build' ? { main: path.join(__dirname, 'src/topography.ts') } : inputFiles;

  return {
    base: baseUrl,
    plugins: [
      py_build_plugin(baseUrl),
      tailwindcss(),
    ],
    build: {
      outDir: './dist',
      rollupOptions: {
        input: rollupInputFiles,
      },
      reportCompressedSize: false,
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
