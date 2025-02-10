import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, cert } from 'firebase-admin/app'

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

async function setUserAsAdmin(email: string) {
  try {
    // Get user by email
    const userRecord = await getAuth().getUserByEmail(email)
    
    // Set admin status in Firestore
    await getFirestore()
      .collection('users')
      .doc(userRecord.uid)
      .set({
        isAdmin: true,
        email: email
      })
    
    console.log(`Successfully set ${email} as admin`)
  } catch (error) {
    console.error('Error setting admin:', error)
  }
}

// Set the email as admin
setUserAsAdmin('alanpaccor@gmail.com') 