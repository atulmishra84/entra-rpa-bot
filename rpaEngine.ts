import puppeteer, { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { once } from 'events';
import * as dotenv from 'dotenv';

dotenv.config();

const storage = {
  updateRpaTask: async (id: number, update: object) => {
    console.log(`[storage] updateRpaTask(${id}):`, update);
  },
  createAutomationLog: async (log: any) => {
    console.log('[storage] createAutomationLog:', log);
  }
};

const LOGIN_URL = `https://login.microsoftonline.com/common/oauth2/authorize?client_id=00000006-0000-0ff1-ce00-000000000000&response_type=code%20id_token&scope=openid%20profile&state=OpenIdConnect.AuthenticationProperties%3DWGtNprv8gTj45zORLs0BjA98in-Tu25fryvuV5d7KVjfpjCVeY3I6HtAsGgkj0H7gJ5opwcuwqX0XDtJjwAKIEazLGbIhjsVScgeh5YMhqGnnvQ74FhktGDIOCf2i30uTQwenUkJbjjeeIK4eViYWIwB7Om7eEVSkVV1Quk-kcaAtUydFUajPuhK1cfXmEh_aaLo8h-zzxy_4NoXGLLdsA&response_mode=form_post&nonce=638880031630247378.NTRmZDNlOTMtNGM2Yy00NDExLWI4MzctNTM5ZmZiMDUwMmI4MmI5YTM2MDEtNWRkZS00NWFkLTg4NDItOThjY2UyNjRiOGMy&redirect_uri=https%3A%2F%2Fadmin.microsoft.com%2Flanding&ui_locales=en-IN&mkt=en-IN&client-request-id=a9d0cf34-548c-46f7-a219-9c12dd210756&claims=%7B%22id_token%22%3A%7B%22xms_cc%22%3A%7B%22values%22%3A%5B%22CP1%22%5D%7D%7D%7D&x-client-SKU=ID_NET472&x-client-ver=8.9.0.0`; // truncated for clarity

const readCSVData = async (filePath: string) => {
  const users: any[] = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];

  rl.on('line', (line: string) => {
    const values = line.split(',');
    if (headers.length === 0) {
      headers = values;
    } else {
      const user: any = {};
      headers.forEach((h, i) => user[h.trim()] = values[i]?.trim() || '');
      users.push(user);
    }
  });

  await once(rl, 'close');
  return users;
};

const getInputByLabel = async (page: Page, labelText: string): Promise<string> => {
  const forAttr = await page.evaluate((text) => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find(label => label.textContent?.trim() === text);
    return label?.getAttribute('for') || null;
  }, labelText);

  if (!forAttr || typeof forAttr !== 'string') {
    throw new Error(`No valid 'for' attribute found for label: ${labelText}`);
  }

  return `#${forAttr}`;
};

const performLogin = async (page: Page, username: string, password: string, taskId: number) => {
  await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigating to Microsoft Entra login` });

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', String(username));
  await page.click('input[type="submit"]');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="password"]', String(password));
  await page.click('input[type="submit"]');

  try {
    await page.waitForSelector('input[id="idBtn_Back"]', { timeout: 50000 });
    await page.click('input[id="idBtn_Back"]');
  } catch (e) {
    await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: 'No "Stay signed in" prompt appeared.' });
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  const screenshotPath = path.join(__dirname, 'entra-login-success.png') as `${string}.png`;
  await page.screenshot({ path: screenshotPath });
  await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Login successful`, screenshot: screenshotPath });

  const addUserSelector = 'button[data-automation-id="SimplifiedDashboard,DashboardHeader,AddAUserBtn"]';
  for (let i = 0; i < 10; i++) {
    const found = await page.$(addUserSelector);
    if (found) {
      await Promise.all([
        found.click(),
        page.waitForSelector('input[aria-label="First name"]', { timeout: 30000 })
      ]);
      await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Clicked 'Add a user' button and navigated.` });
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const errorPath = path.join(__dirname, 'entra-add-user-error.png') as `${string}.png`;
  await page.screenshot({ path: errorPath });
  await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'error', message: `Failed to locate or click 'Add a user' button after retry`, screenshot: errorPath });
  throw new Error("Add a user button not found or failed to click after retries");
};

export async function runRpa() {
  console.log('[RPA] Running...');
(async () => {
  console.log('🚀 Starting RPA engine...');
  const browser = await puppeteer.launch({
  headless: 'true',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}as any);

  const page = await browser.newPage();

  const taskId = 1;
  const username = process.env.ENTRA_USERNAME!;
  const password = process.env.ENTRA_PASSWORD!;
  const csvPath = path.join(__dirname, 'users.csv');

  await storage.updateRpaTask(taskId, { status: 'running' });

  try {
    await performLogin(page, username, password, taskId);
    const users = await readCSVData(csvPath);

    for (const user of users) {
      await page.waitForSelector('input[aria-label="First name"]');
      await page.type('input[aria-label="First name"]', String(user.firstName || ''));

      await page.waitForSelector('input[aria-label="Last name"]');
      await page.type('input[aria-label="Last name"]', String(user.lastName || ''));

      await page.keyboard.press('Tab');
      await new Promise(resolve => setTimeout(resolve, 300));

      await page.waitForSelector('input[aria-label="Username"]');
      await page.type('input[aria-label="Username"]', String(user.UserPrincipalName || ''));

      await new Promise(resolve => setTimeout(resolve, 5000));
      await page.click('button[data-automation-id="addUserWizardNextBtn"]');

      await page.waitForSelector('input[role="combobox"][aria-labelledby*="ComboBox"]');
      await page.focus('input[role="combobox"][aria-labelledby*="ComboBox"]');
      await page.keyboard.type(String(user.Location || ''));
      await page.keyboard.press('Enter');

      await page.click('input[data-automation-id="AddUserWithoutLicense"]');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await page.click('button[data-automation-id="addUserWizardNextBtn"]');

      await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigated to 'Optional settings'` });

      try {
        const profileHeader = await page.$('button[aria-label*="Profile info"]');
        if (profileHeader) {
          const expanded = await page.evaluate(button => button.getAttribute('aria-expanded'), profileHeader);
          if (expanded === 'false') {
            await profileHeader.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch {}

      const profileFields = [
        { label: 'Job title', key: 'JobTitle' },
        { label: 'Department', key: 'Department' },
        { label: 'Office', key: 'Office' },
        { label: 'Office phone', key: 'OfficePhone' },
        { label: 'Fax number', key: 'FaxNumber' },
        { label: 'Mobile phone', key: 'MobilePhone' },
        { label: 'Street address', key: 'StreetAddress' },
        { label: 'City', key: 'City' },
        { label: 'State or province', key: 'State' },
        { label: 'Zip or postal code', key: 'Zip' }
      ];

      for (const field of profileFields) {
        try {
          const selector = await getInputByLabel(page, field.label);
          await page.waitForSelector(selector, { timeout: 5000 });
          const value = user[field.key] !== undefined ? String(user[field.key]) : '';
          console.log(`[DEBUG] Typing into ${field.label}:`, value);
          await page.type(selector, value);
        } catch (err: any) {
          await storage.createAutomationLog({
            rpaTaskId: taskId,
            logLevel: 'warning',
            message: `Could not fill ${field.label}: ${err.message}`
          });
        }
      }

      try {
        const countrySelector = 'input[aria-label="Country or region"]';
        await page.waitForSelector(countrySelector, { timeout: 5000 });
        await page.click(countrySelector);
        await page.type(countrySelector, String(user.Country || ''));
        await page.keyboard.press('Enter');
      } catch {}

      await new Promise(resolve => setTimeout(resolve, 5000));
      await page.click('button[data-automation-id="addUserWizardNextBtn"]');
      await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigated to 'Review and finish'` });

      await new Promise(resolve => setTimeout(resolve, 5000));
      await Promise.all([
        page.click('button[data-automation-id="addUserWizardNextBtn"]'),
        page.waitForSelector('a[data-automation-id="AddAnotherUserLinkLink"]', { timeout: 30000 })
      ]);

      const creationScreenshot = path.join(__dirname, `user-created-${user.firstName}.png`) as `${string}.png`;
      await page.screenshot({ path: creationScreenshot });
      await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Successfully created user ${user.firstName}`, screenshot: creationScreenshot });

      await page.click('a[data-automation-id="AddAnotherUserLinkLink"]');
      await page.waitForSelector('input[aria-label="First name"]', { timeout: 30000 });
    }

    await storage.updateRpaTask(taskId, { status: 'completed' });
  } catch (error) {
    console.error('[ERROR]', error);
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    await storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'error', message: errorMessage });
    await storage.updateRpaTask(taskId, { status: 'failed' });
  } finally {
    await browser.close();
  }
})()};
