#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'assets/social');
const tmpDir = path.join(outDir, '.tmp-viral-reel');
const font = '/System/Library/Fonts/SFNS.ttf';
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
const durationPerScene = 2.45;

const scenes = [
  {
    image: 'assets/social/fresh/shot-index-seq.png',
    title: 'Your whole fitness week',
    subtitle: 'in one clean dashboard',
  },
  {
    image: 'assets/social/fresh/shot-home.png',
    title: 'Just talk to Orbit',
    subtitle: 'food, water, sleep, recovery, workouts',
  },
  {
    image: 'assets/social/fresh/shot-workout.png',
    title: 'Train with structure',
    subtitle: 'templates, PRs, volume, standards',
  },
  {
    image: 'assets/social/fresh/shot-nutrition-seq.png',
    title: 'Macros without the maze',
    subtitle: 'log faster, review before saving',
  },
  {
    image: 'assets/social/fresh/shot-progress-seq.png',
    title: 'Progress you can see',
    subtitle: 'goals, trends, photos, insights',
  },
  {
    image: 'assets/social/fresh/shot-social-seq.png',
    title: 'BodyPilot',
    subtitle: 'AI fitness tracking in one app',
  },
];

const narration = [
  'Meet BodyPilot.',
  'One app for workouts, nutrition, recovery, progress, and goals.',
  'Tell Orbit what you ate, drank, slept, or trained.',
  'Review it, save it, and keep moving.',
  'Stop tracking fitness in five different places.',
  'Follow BodyPilot for the launch.',
].join(' ');

function ffmpegEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}

function createScene(scene, index) {
  const clipPath = path.join(tmpDir, `scene-${index}.mp4`);
  const inputPath = path.join(root, scene.image);
  const title = ffmpegEscape(scene.title);
  const subtitle = ffmpegEscape(scene.subtitle);

  const zoom = 1 + index * 0.018;
  const filter = [
    `[0:v]scale=1080:-2,crop=1080:2300:0:40,scale=${Math.round(1080 * zoom)}:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1[shot]`,
    `color=c=050607:s=1080x1920:d=${durationPerScene}[bg]`,
    `[bg][shot]overlay=0:0,drawbox=x=0:y=0:w=1080:h=390:color=050607@0.78:t=fill,drawbox=x=0:y=1510:w=1080:h=410:color=050607@0.72:t=fill,drawtext=fontfile='${font}':text='${title}':fontcolor=white:fontsize=74:x=56:y=124,drawtext=fontfile='${font}':text='${subtitle}':fontcolor=34D4FF:fontsize=39:x=60:y=224,drawbox=x=60:y=1704:w=500:h=76:color=34D4FF@0.95:t=fill,drawtext=fontfile='${font}':text='BodyPilot':fontcolor=050607:fontsize=42:x=92:y=1718,drawtext=fontfile='${font}':text='@bodypilot.ai':fontcolor=white:fontsize=34:x=60:y=1814[v]`,
  ].join(';');

  execFileSync(ffmpeg, [
    '-y',
    '-loop',
    '1',
    '-t',
    String(durationPerScene),
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

  const voicePath = path.join(tmpDir, 'voice.aiff');
  execFileSync('say', [
    '-v',
    'Samantha',
    '-r',
    '188',
    '-o',
    voicePath,
    narration,
  ], { stdio: 'inherit' });

  const clips = scenes.map(createScene);
  const concatList = path.join(tmpDir, 'concat.txt');
  writeFileSync(concatList, `${clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n')}\n`);

  const silentVideo = path.join(tmpDir, 'video-only.mp4');
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
    silentVideo,
  ], { stdio: 'inherit' });

  const output = path.join(outDir, 'bodypilot-viral-reel.mp4');
  const totalDuration = scenes.length * durationPerScene;
  execFileSync(ffmpeg, [
    '-y',
    '-i',
    silentVideo,
    '-i',
    voicePath,
    '-f',
    'lavfi',
    '-t',
    String(totalDuration),
    '-i',
    'sine=frequency=78:sample_rate=44100',
    '-f',
    'lavfi',
    '-t',
    String(totalDuration),
    '-i',
    'sine=frequency=156:sample_rate=44100',
    '-filter_complex',
    '[1:a]volume=1.15,adelay=250|250[voice];[2:a]volume=0.026[m1];[3:a]volume=0.012[m2];[m1][m2]amix=inputs=2,afade=t=in:st=0:d=0.4,afade=t=out:st=13.8:d=0.8[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[a]',
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-shortest',
    '-movflags',
    '+faststart',
    output,
  ], { stdio: 'inherit' });

  console.log(`Created ${output}`);
}

main();
