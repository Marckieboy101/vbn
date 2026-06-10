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

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: getGoogleClientId(),
    scope: SHEETS_SCOPE,
    callback: (tokenResponse: any) => {
      if (pendingTokenCallback) {
        pendingTokenCallback(tokenResponse);
      }
    },
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
        reject(new Error(tokenResponse.error_description || tokenResponse.error));
        return;
      }

      if (!tokenResponse.access_token) {
        reject(new Error('Geen access token verkregen via Google OAuth.'));
        return;
      }

      cachedAccessToken = tokenResponse.access_token;
      const token = cachedAccessToken;

      try {
        const userInfo = await fetchUserInfo(token);
        googleUser = userInfo;
        resolve({ user: userInfo, token });
      } catch (error) {
        console.error('Kon gebruikersinformatie niet ophalen:', error);
        googleUser = null;
        resolve({ user: null, token });
      }
    };

    try {
      tokenClient.request({ prompt: 'consent' });
    } catch (error) {
      pendingTokenCallback = null;
      reject(error);
    }
  });
};

export const logoutGoogleSheets = (): void => {
  cachedAccessToken = null;
  googleUser = null;
};

export const getCachedToken = (): string | null => cachedAccessToken;

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

export const writeHeaders = async (spreadsheetId: string, sheetName: string): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Niet geautoriseerd.');

  const headers = [
    'UID Sequence',
    'Tijdstip',
    'Vibe / Genres',
    'Archetype',
    'Filmduur',
    'Immersie Spectrum',
    'Sociaal Engagement',
    'Reflectie-Pauzes',
    'Leeftijdsgroep',
    'Reserved Col 2',
    'Reserved Col 3',
    'Voice Feedback (Gezuiverd)',
    'Voice Feedback (Origineel)',
    'Moderatie Filter',
    'Sessie Status',
  ];

  const range = `${sheetName}!A1:O1`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [headers],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij schrijven van headers: ${errText}`);
  }
};

export const syncSessionsToSpreadsheet = async (
  spreadsheetId: string,
  sheetName: string,
  sessions: any[]
): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Niet geautoriseerd.');

  const clearRange = `${sheetName}!A2:O2000`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (sessions.length === 0) return;

  const rows = sessions.map((s) => {
    const getParamVal = (keyPattern: string) => {
      if (!s.answers) return 'N/V';
      const key = Object.keys(s.answers).find((k) => k.toLowerCase().includes(keyPattern));
      return key ? `${s.answers[key]}%` : 'N/V';
    };

    const formattedDate = s.timestamp ? new Date(s.timestamp).toLocaleString('nl-NL') : 'Onbekend';

    return [
      s.sessionId || 'Onbekend',
      formattedDate,
      s.genres?.join(', ') || 'Geen',
      s.archetypeTitle || s.archetype || 'Onbekend',
      getParamVal('duration') !== 'N/V' ? getParamVal('duration') : getParamVal('duur'),
      getParamVal('immersion') !== 'N/V' ? getParamVal('immersion') : getParamVal('immers'),
      getParamVal('social') !== 'N/V' ? getParamVal('social') : getParamVal('socia'),
      getParamVal('breaks') !== 'N/V' ? getParamVal('breaks') : getParamVal('pauz'),
      s.ageGroup || '-',
      '-',
      '-',
      s.voice_feedback || '-',
      s.voice_feedback_original || '-',
      s.voice_feedback_moderation_toxic ? 'GEBLOKKEERD / NOT TOXISCH' : 'GOEDGEKEURD',
      s.completed ? 'VOLTOOID' : 'ONDERBROKEN',
    ];
  });

  const writeRange = `${sheetName}!A2`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: writeRange,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij schrijven sessiedata: ${errText}`);
  }
};

export const triggerAutomaticGoogleSheetsSync = async (): Promise<boolean> => {
  const token = cachedAccessToken;
  if (!token) {
    console.log('[Auto-Sync] Geen Google Sheets OAuth token gecached. Automatische sync overgeslagen.');
    return false;
  }

  const saved = localStorage.getItem('vb_spreadsheet');
  if (!saved) {
    console.log('[Auto-Sync] Geen actieve spreadsheet gekoppeld in localStorage. Automatische sync overgeslagen.');
    return false;
  }

  try {
    const spreadsheet: SpreadsheetInfo = JSON.parse(saved);
    if (!spreadsheet.spreadsheetId) return false;

    console.log('[Auto-Sync] Automatische synchronisatie gestart voor:', spreadsheet.title);

    const sessionsResponse = localStorage.getItem(SESSION_STORAGE_KEY);
    const sessions = sessionsResponse ? (JSON.parse(sessionsResponse) as any[]) : [];
    sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const sheetName = await getSheetFirstTabTitle(spreadsheet.spreadsheetId);
    await writeHeaders(spreadsheet.spreadsheetId, sheetName);
    await syncSessionsToSpreadsheet(spreadsheet.spreadsheetId, sheetName, sessions);

    console.log('[Auto-Sync] Automatische synchronisatie succesvol afgerond.');
    return true;
  } catch (err) {
    console.warn('[Auto-Sync] Fout tijdens automatische Google Sheets synchronisatie:', err);
    return false;
  }
};
