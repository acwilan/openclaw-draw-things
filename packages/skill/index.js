const { execFile } = require('child_process');
const { promisify } = require('util');
const { mkdir } = require('fs/promises');
const path = require('path');
const os = require('os');

const execFileAsync = promisify(execFile);

// Aspect ratio mapping
const ASPECT_RATIOS = {
  '1:1': { width: 1024, height: 1024 },
  '2:3': { width: 832, height: 1216 },
  '3:2': { width: 1216, height: 832 },
  '3:4': { width: 896, height: 1152 },
  '4:3': { width: 1152, height: 896 },
  '4:5': { width: 896, height: 1120 },
  '5:4': { width: 1120, height: 896 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
  '21:9': { width: 1536, height: 640 },
};

function parseSize(size) {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }
  return null;
}

function roundTo64(n) {
  return Math.round(n / 64) * 64;
}

async function generateImage(params) {
  const {
    prompt,
    negativePrompt,
    model,
    size,
    aspectRatio,
    width,
    height,
    steps = 20,
    cfg = 7.0,
    count = 1,
    seed,
    cliPath = 'draw-things-cli',
    outputDir = path.join(os.homedir(), 'Downloads', 'draw-things-output'),
    modelsDir,
    defaultModel
  } = params;

  // Determine dimensions
  let imgWidth = width || 1024;
  let imgHeight = height || 1024;
  
  if (size) {
    const parsed = parseSize(size);
    if (parsed) {
      imgWidth = parsed.width;
      imgHeight = parsed.height;
    }
  } else if (aspectRatio && ASPECT_RATIOS[aspectRatio]) {
    ({ width: imgWidth, height: imgHeight } = ASPECT_RATIOS[aspectRatio]);
  }
  
  // Round to multiples of 64
  imgWidth = roundTo64(imgWidth);
  imgHeight = roundTo64(imgHeight);
  
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Build arguments
  const args = [
    'generate',
    '--prompt', prompt,
    '--width', String(imgWidth),
    '--height', String(imgHeight),
    '--steps', String(steps),
    '--cfg', String(cfg),
  ];
  
  const modelToUse = model || defaultModel;
  if (modelToUse) {
    args.push('--model', modelToUse);
  }
  
  if (negativePrompt) {
    args.push('--negative-prompt', negativePrompt);
  }
  
  if (modelsDir) {
    args.push('--models-dir', modelsDir);
  }
  
  if (seed !== undefined) {
    args.push('--seed', String(seed));
  }
  
  // Generate images
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const outputFile = path.join(outputDir, `generated-${Date.now()}-${i}.png`);
    const runArgs = [...args, '--output', outputFile];
    
    // Vary seed for multiple images
    if (count > 1 && seed === undefined) {
      runArgs.push('--seed', String(Math.floor(Math.random() * 2147483647)));
    }
    
    try {
      await execFileAsync(cliPath, runArgs, {
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });
      
      results.push(outputFile);
    } catch (error) {
      throw new Error(`Draw Things generation failed: ${error.message}`);
    }
  }
  
  return {
    images: results.map(p => ({ path: p })),
    applied: {
      width: imgWidth,
      height: imgHeight,
      steps,
      cfg,
      model: modelToUse || 'default',
    },
  };
}

module.exports = { generateImage };
