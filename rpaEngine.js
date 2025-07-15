"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRpa = runRpa;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const events_1 = require("events");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const storage = {
    updateRpaTask: (id, update) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`[storage] updateRpaTask(${id}):`, update);
    }),
    createAutomationLog: (log) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('[storage] createAutomationLog:', log);
    })
};
const LOGIN_URL = `https://login.microsoftonline.com/common/oauth2/authorize?client_id=00000006-0000-0ff1-ce00-000000000000&response_type=code%20id_token&scope=openid%20profile&state=OpenIdConnect.AuthenticationProperties%3DWGtNprv8gTj45zORLs0BjA98in-Tu25fryvuV5d7KVjfpjCVeY3I6HtAsGgkj0H7gJ5opwcuwqX0XDtJjwAKIEazLGbIhjsVScgeh5YMhqGnnvQ74FhktGDIOCf2i30uTQwenUkJbjjeeIK4eViYWIwB7Om7eEVSkVV1Quk-kcaAtUydFUajPuhK1cfXmEh_aaLo8h-zzxy_4NoXGLLdsA&response_mode=form_post&nonce=638880031630247378.NTRmZDNlOTMtNGM2Yy00NDExLWI4MzctNTM5ZmZiMDUwMmI4MmI5YTM2MDEtNWRkZS00NWFkLTg4NDItOThjY2UyNjRiOGMy&redirect_uri=https%3A%2F%2Fadmin.microsoft.com%2Flanding&ui_locales=en-IN&mkt=en-IN&client-request-id=a9d0cf34-548c-46f7-a219-9c12dd210756&claims=%7B%22id_token%22%3A%7B%22xms_cc%22%3A%7B%22values%22%3A%5B%22CP1%22%5D%7D%7D%7D&x-client-SKU=ID_NET472&x-client-ver=8.9.0.0`; // truncated for clarity
const readCSVData = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    const users = [];
    const fileStream = fs_1.default.createReadStream(filePath);
    const rl = readline_1.default.createInterface({ input: fileStream, crlfDelay: Infinity });
    let headers = [];
    rl.on('line', (line) => {
        const values = line.split(',');
        if (headers.length === 0) {
            headers = values;
        }
        else {
            const user = {};
            headers.forEach((h, i) => { var _a; return user[h.trim()] = ((_a = values[i]) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
            users.push(user);
        }
    });
    yield (0, events_1.once)(rl, 'close');
    return users;
});
const getInputByLabel = (page, labelText) => __awaiter(void 0, void 0, void 0, function* () {
    const forAttr = yield page.evaluate((text) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find(label => { var _a; return ((_a = label.textContent) === null || _a === void 0 ? void 0 : _a.trim()) === text; });
        return (label === null || label === void 0 ? void 0 : label.getAttribute('for')) || null;
    }, labelText);
    if (!forAttr || typeof forAttr !== 'string') {
        throw new Error(`No valid 'for' attribute found for label: ${labelText}`);
    }
    return `#${forAttr}`;
});
const performLogin = (page, username, password, taskId) => __awaiter(void 0, void 0, void 0, function* () {
    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigating to Microsoft Entra login` });
    yield page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    yield page.waitForSelector('input[type="email"]');
    yield page.type('input[type="email"]', String(username));
    yield page.click('input[type="submit"]');
    yield new Promise(resolve => setTimeout(resolve, 2000));
    yield page.waitForSelector('input[type="password"]');
    yield page.type('input[type="password"]', String(password));
    yield page.click('input[type="submit"]');
    try {
        yield page.waitForSelector('input[id="idBtn_Back"]', { timeout: 50000 });
        yield page.click('input[id="idBtn_Back"]');
    }
    catch (e) {
        yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: 'No "Stay signed in" prompt appeared.' });
    }
    yield page.waitForNavigation({ waitUntil: 'networkidle2' });
    const screenshotPath = path_1.default.join(__dirname, 'entra-login-success.png');
    yield page.screenshot({ path: screenshotPath });
    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Login successful`, screenshot: screenshotPath });
    const addUserSelector = 'button[data-automation-id="SimplifiedDashboard,DashboardHeader,AddAUserBtn"]';
    for (let i = 0; i < 10; i++) {
        const found = yield page.$(addUserSelector);
        if (found) {
            yield Promise.all([
                found.click(),
                page.waitForSelector('input[aria-label="First name"]', { timeout: 30000 })
            ]);
            yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Clicked 'Add a user' button and navigated.` });
            return;
        }
        yield new Promise(resolve => setTimeout(resolve, 500));
    }
    const errorPath = path_1.default.join(__dirname, 'entra-add-user-error.png');
    yield page.screenshot({ path: errorPath });
    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'error', message: `Failed to locate or click 'Add a user' button after retry`, screenshot: errorPath });
    throw new Error("Add a user button not found or failed to click after retries");
});
function runRpa() {
    return __awaiter(this, void 0, void 0, function* () {
        (() => __awaiter(this, void 0, void 0, function* () {
            console.log('🚀 Starting RPA engine...');
            const browser = yield puppeteer_1.default.launch({ headless: false });
            const page = yield browser.newPage();
            const taskId = 1;
            const username = process.env.ENTRA_USERNAME;
            const password = process.env.ENTRA_PASSWORD;
            const csvPath = path_1.default.join(__dirname, 'users.csv');
            yield storage.updateRpaTask(taskId, { status: 'running' });
            try {
                yield performLogin(page, username, password, taskId);
                const users = yield readCSVData(csvPath);
                for (const user of users) {
                    yield page.waitForSelector('input[aria-label="First name"]');
                    yield page.type('input[aria-label="First name"]', String(user.firstName || ''));
                    yield page.waitForSelector('input[aria-label="Last name"]');
                    yield page.type('input[aria-label="Last name"]', String(user.lastName || ''));
                    yield page.keyboard.press('Tab');
                    yield new Promise(resolve => setTimeout(resolve, 300));
                    yield page.waitForSelector('input[aria-label="Username"]');
                    yield page.type('input[aria-label="Username"]', String(user.UserPrincipalName || ''));
                    yield new Promise(resolve => setTimeout(resolve, 5000));
                    yield page.click('button[data-automation-id="addUserWizardNextBtn"]');
                    yield page.waitForSelector('input[role="combobox"][aria-labelledby*="ComboBox"]');
                    yield page.focus('input[role="combobox"][aria-labelledby*="ComboBox"]');
                    yield page.keyboard.type(String(user.Location || ''));
                    yield page.keyboard.press('Enter');
                    yield page.click('input[data-automation-id="AddUserWithoutLicense"]');
                    yield new Promise(resolve => setTimeout(resolve, 5000));
                    yield page.click('button[data-automation-id="addUserWizardNextBtn"]');
                    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigated to 'Optional settings'` });
                    try {
                        const profileHeader = yield page.$('button[aria-label*="Profile info"]');
                        if (profileHeader) {
                            const expanded = yield page.evaluate(button => button.getAttribute('aria-expanded'), profileHeader);
                            if (expanded === 'false') {
                                yield profileHeader.click();
                                yield new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }
                    }
                    catch (_a) { }
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
                            const selector = yield getInputByLabel(page, field.label);
                            yield page.waitForSelector(selector, { timeout: 5000 });
                            const value = user[field.key] !== undefined ? String(user[field.key]) : '';
                            console.log(`[DEBUG] Typing into ${field.label}:`, value);
                            yield page.type(selector, value);
                        }
                        catch (err) {
                            yield storage.createAutomationLog({
                                rpaTaskId: taskId,
                                logLevel: 'warning',
                                message: `Could not fill ${field.label}: ${err.message}`
                            });
                        }
                    }
                    try {
                        const countrySelector = 'input[aria-label="Country or region"]';
                        yield page.waitForSelector(countrySelector, { timeout: 5000 });
                        yield page.click(countrySelector);
                        yield page.type(countrySelector, String(user.Country || ''));
                        yield page.keyboard.press('Enter');
                    }
                    catch (_b) { }
                    yield new Promise(resolve => setTimeout(resolve, 5000));
                    yield page.click('button[data-automation-id="addUserWizardNextBtn"]');
                    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Navigated to 'Review and finish'` });
                    yield new Promise(resolve => setTimeout(resolve, 5000));
                    yield Promise.all([
                        page.click('button[data-automation-id="addUserWizardNextBtn"]'),
                        page.waitForSelector('a[data-automation-id="AddAnotherUserLinkLink"]', { timeout: 30000 })
                    ]);
                    const creationScreenshot = path_1.default.join(__dirname, `user-created-${user.firstName}.png`);
                    yield page.screenshot({ path: creationScreenshot });
                    yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'info', message: `Successfully created user ${user.firstName}`, screenshot: creationScreenshot });
                    yield page.click('a[data-automation-id="AddAnotherUserLinkLink"]');
                    yield page.waitForSelector('input[aria-label="First name"]', { timeout: 30000 });
                }
                yield storage.updateRpaTask(taskId, { status: 'completed' });
            }
            catch (error) {
                console.error('[ERROR]', error);
                const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
                yield storage.createAutomationLog({ rpaTaskId: taskId, logLevel: 'error', message: errorMessage });
                yield storage.updateRpaTask(taskId, { status: 'failed' });
            }
            finally {
                yield browser.close();
            }
        }))();
    });
}
;
