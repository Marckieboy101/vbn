import type { SessionData } from '../lib/sessionStorage';
import {
  GUIDE_TAB,
  SESSIONS_TAB,
  SUMMARY_TAB,
  buildLayoutRequests,
  buildSessionRows,
  buildSummaryRows,
} from './googleSheetsLayout';

declare global {
  interface Window {
    google?: any;
  }
}

export interface GoogleUser {
  email?: string;
  name?: string;
  picture?: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

let tokenClient: any = null;
let cachedAccessToken: string | null = null;
let googleUser: GoogleUser | null = null;
let pendingTokenCallback: ((resp: any) => void) | null = null;

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets openid email profile';
const SESSION_STORAGE_KEY = 'vb_sessions';
const AUTH_STORAGE_KEY = 'vb_google_auth';
const AUTOMATIC_SYNC_THROTTLE_MS = 20_000;
const AUTOMATIC_SYNC_RETRY_MS = 60_000;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
const TOKEN_RENEWAL_TIMEOUT_MS = 15_000;
let tokenExpiresAt = 0;
let autoSyncInFlight = false;
let lastAutoSyncTimestamp = 0;
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;

// sessionStorage: the login survives a page reload, but not closing the tab on a shared device.
const persistAuth = (): void => {
  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ token: cachedAccessToken, expiresAt: tokenExpiresAt, user: googleUser })
  );
};

const restoreAuth = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (!saved?.token) return;
    cachedAccessToken = saved.token;
    tokenExpiresAt = saved.expiresAt;
    googleUser = saved.user;
  } catch {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

restoreAuth();

const applyTokenResponse = (tokenResponse: any): void => {
  cachedAccessToken = tokenResponse.access_token;
  tokenExpiresAt = Date.now() + Number(tokenResponse.expires_in) * 1000;
  persistAuth();
};

const loadGoogleIdentityServices = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browseromgeving vereist voor Google OAuth.'));
  }

  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-identity]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Kon Google Identity Services niet laden.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-identity', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kon Google Identity Services niet laden.'));
    document.head.appendChild(script);
  });
};

const getGoogleClientId = (): string => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Geen Google OAuth Client ID ingesteld. Voeg VITE_GOOGLE_CLIENT_ID toe aan uw .env.local.');
  }
  return clientId;
};

const initTokenClient = (): void => {
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error('Google Identity Services niet beschikbaar.');
  }

  if (tokenClient) return;

  const clientId = getGoogleClientId();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_SCOPE,
    callback: (tokenResponse: any) => {
      if (pendingTokenCallback) {
        pendingTokenCallback(tokenResponse);
      }
    },
    error_callback: (error: any) => {
      if (pendingTokenCallback) {
        pendingTokenCallback({ error: error?.type || 'popup_failed' });
      }
    },
  });
};

// Google tokens last about an hour. Renews without a consent screen, but the browser can still block this.
const renewAccessToken = async (): Promise<boolean> => {
  await loadGoogleIdentityServices();
  initTokenClient();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingTokenCallback = null;
      resolve(false);
    }, TOKEN_RENEWAL_TIMEOUT_MS);

    pendingTokenCallback = (tokenResponse: any) => {
      clearTimeout(timeout);
      pendingTokenCallback = null;
      if (tokenResponse.error || !tokenResponse.access_token) {
        console.warn('[Auto-Sync] Google-token vernieuwen mislukt:', tokenResponse.error);
        resolve(false);
        return;
      }
      applyTokenResponse(tokenResponse);
      resolve(true);
    };

    tokenClient.requestAccessToken({ prompt: '', scope: SHEETS_SCOPE, login_hint: googleUser?.email });
  });
};

const fetchUserInfo = async (token: string): Promise<GoogleUser> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return {};
  }

  return await response.json();
};

export const loginWithGoogleSheets = async (): Promise<{ user: GoogleUser | null; token: string }> => {
  await loadGoogleIdentityServices();
  initTokenClient();

  return new Promise((resolve, reject) => {
    pendingTokenCallback = async (tokenResponse: any) => {
      pendingTokenCallback = null;

      if (tokenResponse.error) {
          console.error('[GoogleIDS] tokenResponse.error', tokenResponse);
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
        return;
      }

      if (!tokenResponse.access_token) {
        reject(new Error('Geen access token verkregen via Google OAuth.'));
        return;
      }

      applyTokenResponse(tokenResponse);
      const token = tokenResponse.access_token;

      try {
        const userInfo = await fetchUserInfo(token);
        googleUser = userInfo;
        persistAuth();
        resolve({ user: userInfo, token });
      } catch (error) {
        console.error('Kon gebruikersinformatie niet ophalen:', error);
        googleUser = null;
        resolve({ user: null, token });
      }
    };

    try {
      // Pass scope explicitly to ensure tokens include the Sheets scope even if prior consent was limited.
      tokenClient.requestAccessToken({ prompt: 'consent', scope: SHEETS_SCOPE });
    } catch (error) {
      pendingTokenCallback = null;
      reject(error);
    }
  });
};

export const logoutGoogleSheets = (): void => {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  googleUser = null;
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getCachedToken = (): string | null =>
  Date.now() < tokenExpiresAt - TOKEN_EXPIRY_MARGIN_MS ? cachedAccessToken : null;

export const getGoogleUser = (): GoogleUser | null => googleUser;

export const createSpreadsheet = async (title: string): Promise<SpreadsheetInfo> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Sheets sessie is niet geautoriseerd. Log eerst in.');
  }

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    try {
      const errJson = JSON.parse(errText);
      const reason = errJson?.error?.details?.[0]?.reason;
      if (reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
        throw new Error(
          'Fout bij aanmaken spreadsheet: onvoldoende machtigingen op het access token. Herautorisatie is nodig. Probeer in een incognito-venster in te loggen of verwijder de bestaande app-toestemming in uw Google-account en probeer opnieuw.'
        );
      }
    } catch (e) {
      // fallthrough to generic error
    }

    throw new Error(`Fout bij aanmaken spreadsheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties.title,
  };
};

export const getSheetFirstTabTitle = async (spreadsheetId: string): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Niet geautoriseerd.');
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij laden spreadsheet structuur: ${errText}`);
  }

  const data = await response.json();
  const firstSheetName = data.sheets?.[0]?.properties?.title;
  return firstSheetName || 'Sheet1';
};

// Builds the tabs and formatting once. The batch is atomic, so the Uitleg tab only exists on a fully prepared spreadsheet.
export const prepareSpreadsheet = async (spreadsheetId: string): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Niet geautoriseerd.');

  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!metaResponse.ok) {
    const errText = await metaResponse.text();
    throw new Error(`Fout bij laden spreadsheet structuur: ${errText}`);
  }

  const meta = await metaResponse.json();
  const tabs: { sheetId: number; title: string }[] = (meta.sheets ?? []).map((sheet: any) => sheet.properties);
  if (tabs.some((tab) => tab.title === GUIDE_TAB)) return;

  const dataTab = tabs.find((tab) => tab.title === SESSIONS_TAB) ?? tabs[0];
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: buildLayoutRequests(dataTab.sheetId) }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij opmaken spreadsheet: ${errText}`);
  }
};

export const syncSessionsToSpreadsheet = async (spreadsheetId: string, sessions: SessionData[]): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Niet geautoriseerd.');

  // A browser without local sessions must not wipe a spreadsheet that already holds data.
  if (sessions.length === 0) return;

  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SESSIONS_TAB}!A2:N:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!clearResponse.ok) {
    const errText = await clearResponse.text();
    throw new Error(`Fout bij leegmaken sessiedata: ${errText}`);
  }

  // RAW keeps visitor text inert: feedback starting with "=" must never run as a formula.
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: `${SESSIONS_TAB}!A2`, majorDimension: 'ROWS', values: buildSessionRows(sessions) },
        {
          range: `${SUMMARY_TAB}!A1`,
          majorDimension: 'ROWS',
          values: buildSummaryRows(sessions, new Date().toLocaleString('nl-NL')),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij schrijven sessiedata: ${errText}`);
  }
};

const scheduleAutomaticSync = (delayMs: number): void => {
  if (autoSyncTimer) return;
  autoSyncTimer = setTimeout(() => {
    autoSyncTimer = null;
    triggerAutomaticGoogleSheetsSync();
  }, delayMs);
};

export const triggerAutomaticGoogleSheetsSync = async (): Promise<boolean> => {
  if (!cachedAccessToken) {
    console.log('[Auto-Sync] Niet ingelogd bij Google. Automatische sync overgeslagen.');
    return false;
  }

  const saved = localStorage.getItem('vb_spreadsheet');
  if (!saved) {
    console.log('[Auto-Sync] Geen actieve spreadsheet gekoppeld in localStorage. Automatische sync overgeslagen.');
    return false;
  }

  try {
    const now = Date.now();
    const throttleRemaining = lastAutoSyncTimestamp + AUTOMATIC_SYNC_THROTTLE_MS - now;
    if (autoSyncInFlight || throttleRemaining > 0) {
      // Never drop a save: the delayed sync uploads the newest data, including a session's final step.
      scheduleAutomaticSync(autoSyncInFlight ? AUTOMATIC_SYNC_THROTTLE_MS : throttleRemaining);
      return false;
    }

    autoSyncInFlight = true;
    lastAutoSyncTimestamp = now;

    if (!getCachedToken() && !(await renewAccessToken())) {
      console.warn('[Auto-Sync] Google-login verlopen. Sessies blijven lokaal bewaard tot opnieuw is ingelogd.');
      return false;
    }

    const spreadsheet: SpreadsheetInfo = JSON.parse(saved);
    if (!spreadsheet.spreadsheetId) return false;

    console.log('[Auto-Sync] Automatische synchronisatie gestart voor:', spreadsheet.title);

    const sessionsResponse = localStorage.getItem(SESSION_STORAGE_KEY);
    const sessions = sessionsResponse ? (JSON.parse(sessionsResponse) as SessionData[]) : [];
    sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    await prepareSpreadsheet(spreadsheet.spreadsheetId);
    await syncSessionsToSpreadsheet(spreadsheet.spreadsheetId, sessions);

    console.log('[Auto-Sync] Automatische synchronisatie succesvol afgerond.');
    return true;
  } catch (err) {
    console.warn('[Auto-Sync] Fout tijdens automatische Google Sheets synchronisatie:', err);
    scheduleAutomaticSync(AUTOMATIC_SYNC_RETRY_MS);
    return false;
  } finally {
    autoSyncInFlight = false;
  }
};
