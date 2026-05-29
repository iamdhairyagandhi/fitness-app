#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'assets/social');
const tmpDir = path.join(outDir, '.tmp-launch-reel');
const font = '/System/Library/Fonts/SFNS.ttf';
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';

const scenes = [
  {
    image: 'store/apple/screenshot/en-US/APP_IPHONE_67/nutrition.png',
    title: 'Stop tracking fitness',
    subtitle: 'in five different apps',
  },
  {
    image: 'store/apple/screenshot/en-US/APP_IPHONE_67/workout.png',
    title: 'Log workouts',
    subtitle: 'sets, PRs, cardio, and volume',
  },
  {
    image: 'store/apple/screenshot/en-US/APP_IPHONE_67/progress.png',
    title: 'See progress',
    subtitle: 'photos, goals, and trends together',
  },
  {
    image: 'store/apple/screenshot/en-US/APP_IPHONE_67/social.png',
    title: 'Build momentum',
    subtitle: 'challenges, profiles, and leaderboards',
  },
  {
    image: 'store/apple/screenshot/en-US/APP_IPHONE_67/profile.png',
    title: 'Meet BodyPilot',
    subtitle: 'AI fitness tracking in one place',
  },
];

function ffmpegEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}

function createScene(scene, index) {
  const clipPath = path.join(tmpDir, `scene-${index}.mp4`);
  const inputPath = path.join(root, scene.image);
  const title = ffmpegEscape(scene.title);
  const subtitle = ffmpegEscape(scene.subtitle);

  const filter = [
    '[0:v]scale=700:-1,crop=700:1520:0:120,setsar=1[shot]',
    `color=c=0F0F0F:s=1080x1920:d=2.8[bg]`,
    `[bg][shot]overlay=(W-w)/2:315,drawbox=x=120:y=100:w=840:h=172:color=0F0F0F@0.74:t=fill,drawtext=fontfile='${font}':text='${title}':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=124,drawtext=fontfile='${font}':text='${subtitle}':fontcolor=7DF9B6:fontsize=40:x=(w-text_w)/2:y=206,drawbox=x=200:y=1760:w=680:h=74:color=17D276@0.96:t=fill,drawtext=fontfile='${font}':text='BodyPilot':fontcolor=0F0F0F:fontsize=42:x=(w-text_w)/2:y=1773[v]`,
  ].join(';');

  execFileSync(ffmpeg, [
    '-y',
    '-loop',
    '1',
    '-t',
    '2.8',
    '-i',
    inputPath,
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
    clipPath,
  ], { stdio: 'inherit' });

  return clipPath;
}

function main() {
  mkdirSync(outDir, { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const clips = scenes.map(createScene);
  const concatList = path.join(tmpDir, 'concat.txt');
  const concatBody = clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n');
  writeFileSync(concatList, `${concatBody}\n`);

  const output = path.join(outDir, 'bodypilot-launch-reel.mp4');
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
    output,
  ], { stdio: 'inherit' });

  console.log(`Created ${output}`);
}

main();
