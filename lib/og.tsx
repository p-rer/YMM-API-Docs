import React from 'react';
import satori from 'satori';
import fs from 'fs';
import path from 'path';
import { SITE_TITLE } from './siteSetting';

export async function generateOgImagePngBuffer(title: string, lastUpdate: string): Promise<Buffer> {
  const fontData = fs.readFileSync('app/fonts/ZenOldMincho-Medium.ttf');

  const jsx = (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header section (5/6 of height) */}
      <div
        style={{
          flex: 5,
          backgroundColor: '#1A1A1A',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '60px'
        }}
      >
        {/* Documentation text and circle in top left */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '8px'
            }}
          />
          <span style={{ color: 'white', fontSize: '28px' }}>{SITE_TITLE}</span>
        </div>

        {/* Introduction text in center-left */}
        <h1
          style={{
            color: 'white',
            fontSize: '60px',
            fontWeight: 'bold',
            maxWidth: '80%',
            textAlign: 'left',
            wordBreak: 'break-word'
          }}
        >
          {title}
        </h1>
      </div>

      {/* Footer section (1/6 of height) */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '32px'
        }}
      >
        <p style={{ color: '#333', fontSize: '28px' }}>{lastUpdate}</p>
      </div>
    </div>
  );

  const svg = await satori(jsx, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Zen Old Mincho',
        data: fontData,
        weight: 500,
        style: 'normal'
      }
    ]
  });
  const sharp = require('sharp');
  return sharp(Buffer.from(svg, 'utf-8')).png().toBuffer()
}

export async function generateOgImageStatic(title: string, lastUpdate: string): Promise<string> {
  const buffer = await generateOgImagePngBuffer(title, lastUpdate)

  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export async function generateOgImageFile(fileName: string, title: string, lastUpdate: string): Promise<string> {
  const publicDir = path.join(process.cwd(), 'public', 'og')
  const outputPath = path.join(publicDir, `${fileName}.png`)
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(publicDir, { recursive: true })
    const buffer = await generateOgImagePngBuffer(title, lastUpdate)
    fs.writeFileSync(outputPath, buffer)
  }
  return `/og/${fileName}.png`
}
