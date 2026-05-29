#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'assets/social');
const tmpDir = path.join(outDir, '.tmp-better-reel');
const font = '/System/Library/Fonts/SFNS.ttf';
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';

const scenes = [
  {
    image: 'assets/social/fresh/shot-index-seq.png',
    duration: 1.7,
    title: 'fitness tracking is',
    punch: 'too fragmented',
    bottom: 'workouts here. food there. progress somewhere else.',
  },
  {
    image: 'assets/social/fresh/shot-workout.png',
    duration: 1.65,
    title: 'train',
    punch: 'with structure',
    bottom: 'templates, PRs, volume, standards',
  },
  {
    image: 'assets/social/fresh/shot-nutrition-seq.png',
    duration: 1.65,
    title: 'log food',
    punch: 'without the maze',
    bottom: 'macros, water, meals, AI estimates',
  },
  {
    image: 'assets/social/fresh/shot-progress-seq.png',
    duration: 1.65,
    title: 'see what is',
    punch: 'actually changing',
    bottom: 'photos, goals, trends, weekly insights',
  },
  {
    image: 'assets/social/fresh/shot-home.png',
    duration: 2.0,
    title: 'or just',
    punch: 'talk to Orbit',
    bottom: 'food. sleep. recovery. workouts.',
  },
  {
    image: 'assets/social/fresh/shot-social-seq.png',
    duration: 2.0,
    title: 'BodyPilot',
    punch: 'puts it together',
    bottom: '@bodypilot.ai',
  },
];

function ffmpegEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}

function makeScene(scene, index) {
  const input = path.join(root, scene.image);
  const output = path.join(tmpDir, `scene-${index}.mp4`);
  const title = ffmpegEscape(scene.title);
  const punch = ffmpegEscape(scene.punch);
  const bottom = ffmpegEscape(scene.bottom);
  const accent = index === 0 ? 'FF3B30' : index === 5 ? '7DF9B6' : '34D4FF';
  const zoom = (1.025 + index * 0.012).toFixed(3);

  const filter = [
    `[0:v]scale=1080:-2,crop=1080:2160:0:180,scale=1080:1920,boxblur=28:3,eq=brightness=-0.25:saturation=1.15[bg]`,
    `[0:v]scale=760:-2,crop=760:1645:0:120,scale=trunc(iw*${zoom}/2)*2:-2,crop=760:1645:(iw-760)/2:(ih-1645)/2,setsar=1[phone]`,
    `[bg]drawbox=x=0:y=0:w=1080:h=1920:color=020304@0.38:t=fill[base]`,
    `[base][phone]overlay=(W-w)/2:220,drawbox=x=112:y=204:w=856:h=1680:color=000000@0.58:t=14,drawbox=x=120:y=212:w=840:h=1664:color=050607@0.16:t=8,drawbox=x=0:y=0:w=1080:h=310:color=020304@0.82:t=fill,drawbox=x=0:y=1562:w=1080:h=358:color=020304@0.84:t=fill,drawtext=fontfile='${font}':text='${title}':fontcolor=white:fontsize=58:x=58:y=78,drawtext=fontfile='${font}':text='${punch}':fontcolor=${accent}:fontsize=86:x=58:y=144,drawtext=fontfile='${font}':text='${bottom}':fontcolor=white:fontsize=38:x=58:y=1628,drawbox=x=58:y=1740:w=384:h=62:color=${accent}@0.94:t=fill,drawtext=fontfile='${font}':text='BodyPilot':fontcolor=020304:fontsize=36:x=84:y=1752[v]`,
  ].join(';');

  execFileSync(ffmpeg, [
    '-y',
    '-loop',
    '1',
    '-t',
    String(scene.duration),
    '-i',
    input,
    '-filter_complex',
    filter,
    '-map',
    '[v]',
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output,
  ], { stdio: 'inherit' });

  return output;
}

function main() {
  mkdirSync(outDir, { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const clips = scenes.map(makeScene);
  const concatList = path.join(tmpDir, 'concat.txt');
  writeFileSync(concatList, `${clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n')}\n`);

  const videoOnly = path.join(tmpDir, 'video-only.mp4');
  execFileSync(ffmpeg, [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatList,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    videoOnly,
  ], { stdio: 'inherit' });

  const duration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const output = path.join(outDir, 'bodypilot-better-reel-draft.mp4');

  execFileSync(ffmpeg, [
    '-y',
    '-i',
    videoOnly,
    '-f',
    'lavfi',
    '-t',
    String(duration),
    '-i',
    'sine=frequency=54:sample_rate=44100',
    '-f',
    'lavfi',
    '-t',
    String(duration),
    '-i',
    'sine=frequency=108:sample_rate=44100',
    '-f',
    'lavfi',
    '-t',
    String(duration),
    '-i',
    'anoisesrc=color=white:sample_rate=44100:amplitude=0.18',
    '-filter_complex',
    '[1:a]volume=0.030,atrim=0:10.65[bass];[2:a]volume=0.012,atrim=0:10.65[sub];[3:a]highpass=f=5200,volume=0.010,atrim=0:10.65[hats];[bass][sub][hats]amix=inputs=3,afade=t=in:st=0:d=0.18,afade=t=out:st=9.8:d=0.7,alimiter=limit=0.88[a]',
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-shortest',
    '-movflags',
    '+faststart',
    output,
  ], { stdio: 'inherit' });

  console.log(`Created ${output}`);
}

main();
