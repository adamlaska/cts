/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/import * as child_process from 'child_process';import * as fs from 'fs';
import * as activeWindow from 'active-win';

import { PNG } from 'pngjs';


const waitMS = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function readPng(filename) {
  const data = fs.readFileSync(filename);
  return PNG.sync.read(data);
}

export function writePng(filename, width, height, data) {
  const png = new PNG({ colorType: 6, width, height });
  for (let i = 0; i < data.byteLength; ++i) {
    png.data[i] = data[i];
  }
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filename, buffer);
}

export class ScreenshotManager {


  async init(page) {
    // set the title to some random number so we can find the window by title
    const title = await page.evaluate(() => {
      const title = `t-${Math.random()}`;
      document.title = title;
      return title;
    });

    // wait for the window to show up
    let window;
    for (let i = 0; !window && i < 100; ++i) {
      await waitMS(50);
      const windows = await activeWindow.getOpenWindows({ screenRecordingPermission: true });
      window = windows.find((window) => window.title.includes(title));
    }
    if (!window) {
      throw Error(`could not find window: ${title}`);
    }
    this.window = window;
  }

  async takeScreenshot(page, screenshotName) {
    // await page.screenshot({ path: screenshotName });

    // we need to set the url and title since the screenshot will include the chrome
    await page.evaluate(async () => {
      document.title = 'screenshot';
      window.history.replaceState({}, '', '/screenshot');
    });
    child_process.spawnSync('screencapture', ['-o', '-x', `-l${this.window.id}`, screenshotName]);
  }
}
//# sourceMappingURL=image_utils.js.map