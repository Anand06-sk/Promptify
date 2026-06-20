// auth.js - Firebase Authentication Service

import { auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  createUserProfile,
  getFriendlyErrorMessage,
  sendVerificationEmail,
  sendPasswordReset,
  validateEmailDomain,
  isEmailVerified,
  waitForEmailVerification,
} from "./user-service.js";

/**
 * Login with Google
 * @returns {Promise<Object>} User object on success
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();

    // Force account picker to appear every time
    provider.setCustomParameters({
      prompt: "select_account",
      // Force consent screen to show account list
      access_type: "online",
    });

    console.log("🔵 Initiating Google login with account picker...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("✅ Google login successful:", user.email);
    console.log("📌 User metadata:", {
      created: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime,
    });

    // Create/update user profile in Firestore
    await createUserProfile(user, user.displayName);

    return user;
  } catch (error) {
    console.error("❌ Google login error:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    newError.code = error.code;
    throw newError;
  }
}

/**
 * Signup with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User's display name (optional)
 * @returns {Promise<Object>} User object on success
 */
export async function signupWithEmail(email, password, displayName = "") {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update profile with display name if provided
    if (displayName) {
      await updateProfile(user, {
        displayName: displayName,
      });
    }

    console.log("Signup successful:", user.email);

    // Create user profile in Firestore
    await createUserProfile(user, displayName);

    // Send verification email
    await sendEmailVerification(user);
    console.log("Verification email sent to:", user.email);

    return user;
  } catch (error) {
    console.error("Signup error:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    newError.code = error.code;
    throw newError;
  }
}

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object on success
 */
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    console.log("Email login successful:", user.email);
    console.log("Email verified:", user.emailVerified);

    // Ensure user profile exists in Firestore
    await createUserProfile(user);

    return user;
  } catch (error) {
    console.error("Email login error:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    newError.code = error.code;
    throw newError;
  }
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    throw newError;
  }
}

/**
 * Resend verification email to current user
 * @returns {Promise<void>}
 */
export async function resendVerificationEmail() {
  try {
    await sendVerificationEmail();
  } catch (error) {
    console.error("Error resending verification email:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    throw newError;
  }
}

/**
 * Send password reset email
 * @param {string} email - User email address
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  try {
    await sendPasswordReset(email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const newError = new Error(friendlyMessage);
    throw newError;
  }
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Called with user object or null
 * @returns {Function} Unsubscribe function
 */
export function observeAuthState(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log(
        "User logged in:",
        user.email,
        "Verified:",
        user.emailVerified,
      );
      callback(user);
    } else {
      console.log("User logged out");
      callback(null);
    }
  });
}

// Re-export user-service functions for auth.html
export { validateEmailDomain, isEmailVerified, waitForEmailVerification };
