import { GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const provider = new GoogleAuthProvider();
// Request only the Sheets/Spreadsheets scope as per principle of least privilege
provider.addScope("https://www.googleapis.com/auth/spreadsheets");

// Interactive login and memory-cached access token
let cachedAccessToken: string | null = null;
let googleUser: User | null = null;

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const loginWithGoogleSheets = async (): Promise<{ user: User; token: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Geen access token verkregen via Google OAuth.");
    }
    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    return { user: result.user, token: cachedAccessToken };
  } catch (error) {
    console.error("Fout tijdens inloggen met Google Sheets scope:", error);
    throw error;
  }
};

export const logoutGoogleSheets = () => {
  cachedAccessToken = null;
  googleUser = null;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return googleUser;
};

// Create a new Google Spreadsheet
export const createSpreadsheet = async (title: string): Promise<SpreadsheetInfo> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error("Google Sheets sessie is niet geautoriseerd. Log eerst in.");
  }

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
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

// Retrieve first tab title to avoid hardcoding "Sheet1"
export const getSheetFirstTabTitle = async (spreadsheetId: string): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error("Niet geautoriseerd.");
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij laden spreadsheet structuur: ${errText}`);
  }

  const data = await response.json();
  const firstSheetName = data.sheets?.[0]?.properties?.title;
  return firstSheetName || "Sheet1";
};

// Write structured Table Headers
export const writeHeaders = async (spreadsheetId: string, sheetName: string): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("Niet geautoriseerd.");

  const headers = [
    "UID Sequence",
    "Tijdstip",
    "Vibe / Genres",
    "Archetype",
    "Filmduur",
    "Immersie Spectrum",
    "Sociaal Engagement",
    "Reflectie-Pauzes",
    "Leeftijdsgroep",
    "Reserved Col 2",
    "Reserved Col 3",
    "Voice Feedback (Gezuiverd)",
    "Voice Feedback (Origineel)",
    "Moderatie Filter",
    "Sessie Status"
  ];

  const range = `${sheetName}!A1:O1`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [headers],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij schrijven van headers: ${errText}`);
  }
};

// Harmonize and write session rows to sheet
export const syncSessionsToSpreadsheet = async (
  spreadsheetId: string,
  sheetName: string,
  sessions: any[]
): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error("Niet geautoriseerd.");

  // Clear existing content starting from row 2 up to row 2000 to keep table aligned
  const clearRange = `${sheetName}!A2:O2000`;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (sessions.length === 0) return;

  // Format each session into a row array
  const rows = sessions.map((s) => {
    // Utility helper to extract value matching key
    const getParamVal = (keyPattern: string) => {
      if (!s.answers) return "N/V";
      const key = Object.keys(s.answers).find((k) => k.toLowerCase().includes(keyPattern));
      return key ? `${s.answers[key]}%` : "N/V";
    };

    const formattedDate = s.timestamp
      ? new Date(s.timestamp).toLocaleString("nl-NL")
      : "Onbekend";
    
    return [
      s.sessionId || "Onbekend",
      formattedDate,
      s.genres?.join(", ") || "Geen",
      s.archetypeTitle || s.archetype || "Onbekend",
      getParamVal("duration") !== "N/V" ? getParamVal("duration") : getParamVal("duur"),
      getParamVal("immersion") !== "N/V" ? getParamVal("immersion") : getParamVal("immers"),
      getParamVal("social") !== "N/V" ? getParamVal("social") : getParamVal("socia"),
      getParamVal("breaks") !== "N/V" ? getParamVal("breaks") : getParamVal("pauz"),
      s.ageGroup || "-",
      "-",
      "-",
      s.voice_feedback || "-",
      s.voice_feedback_original || "-",
      s.voice_feedback_moderation_toxic ? "GEBLOKKEERD / NOT TOXISCH" : "GOEDGEKEURD",
      s.completed ? "VOLTOOID" : "ONDERBROKEN",
    ];
  });

  const writeRange = `${sheetName}!A2`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: writeRange,
        majorDimension: "ROWS",
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fout bij schrijven sessiedata: ${errText}`);
  }
};

// Automatic background sync trigger
export const triggerAutomaticGoogleSheetsSync = async (): Promise<boolean> => {
  const token = getCachedToken();
  if (!token) {
    console.log("[Auto-Sync] Geen Google Sheets OAuth token gecached. Automatische sync overgeslagen.");
    return false;
  }

  const saved = localStorage.getItem("vb_spreadsheet");
  if (!saved) {
    console.log("[Auto-Sync] Geen actieve spreadsheet gekoppeld in localStorage. Automatische sync overgeslagen.");
    return false;
  }

  try {
    const spreadsheet: SpreadsheetInfo = JSON.parse(saved);
    if (!spreadsheet.spreadsheetId) return false;

    console.log("[Auto-Sync] Automatische synchronisatie gestart voor:", spreadsheet.title);

    // 1. Fetch sessions
    const querySnapshot = await getDocs(collection(db, "sessions"));
    const sessions: any[] = [];
    querySnapshot.forEach((docSnap) => {
      sessions.push(docSnap.data());
    });

    // Sort descending by timestamp
    sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 2. Get sheet tab title
    const sheetName = await getSheetFirstTabTitle(spreadsheet.spreadsheetId);

    // 3. Write headers and sync
    await writeHeaders(spreadsheet.spreadsheetId, sheetName);
    await syncSessionsToSpreadsheet(spreadsheet.spreadsheetId, sheetName, sessions);

    console.log("[Auto-Sync] Automatische synchronisatie succesvol afgerond.");
    return true;
  } catch (err) {
    console.warn("[Auto-Sync] Fout tijdens automatische Google Sheets synchronisatie:", err);
    return false;
  }
};
