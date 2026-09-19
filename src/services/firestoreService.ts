import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SubmittedApplication } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Connection test per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Persist submitted application record to Firestore database
 */
export async function saveApplicationToFirestore(
  application: SubmittedApplication
): Promise<boolean> {
  try {
    const docRef = doc(db, 'applications', application.applicationId);
    // Sanitize undefined fields for Firestore
    const dataToSave: Record<string, any> = {};
    for (const [key, value] of Object.entries(application)) {
      if (value !== undefined) {
        dataToSave[key] = value;
      }
    }
    await setDoc(docRef, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore application save error:', error);
    return false;
  }
}

/**
 * Retrieve application by Application ID from Firestore
 */
export async function getApplicationFromFirestore(
  applicationId: string
): Promise<SubmittedApplication | null> {
  try {
    const docRef = doc(db, 'applications', applicationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SubmittedApplication;
    }
    return null;
  } catch (error) {
    console.warn('Firestore fetch error:', error);
    return null;
  }
}
