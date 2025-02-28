import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID || 
        !process.env.FIREBASE_ADMIN_PRIVATE_KEY || 
        !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error('Missing Firebase admin credentials in environment variables');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
}

export default admin;
