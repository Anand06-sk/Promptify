// user-service.js - User Profile and Email Management

import { db, auth } from "./firebase-config.js";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/**
 * Friendly error messages mapping Firebase error codes
 */
const ERROR_MESSAGES = {
  "auth/email-already-in-use":
    "This email is already registered. Try logging in instead.",
  "auth/invalid-credential":
    "Email or password is incorrect. Please try again.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed": "Email/password accounts are not enabled.",
  "auth/weak-password": "Password must be at least 8 characters long.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Email or password is incorrect. Please try again.",
  "auth/too-many-requests": "Too many login attempts. Please try again later.",
  "auth/unauthorized-domain":
    "This domain is not authorized. Check Firebase console.",
  "auth/popup-blocked":
    "Popup was blocked by your browser. Please enable popups.",
  "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
};

/**
 * Get friendly error message from Firebase error code
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  const code = error.code || "";
  return (
    ERROR_MESSAGES[code] ||
    error.message ||
    "An error occurred. Please try again."
  );
}

/**
 * Create a user profile document in Firestore
 * @param {Object} firebaseUser - Firebase user object from auth
 * @param {string} displayName - User's display name (optional)
 * @returns {Promise<void>}
 */
export async function createUserProfile(firebaseUser, displayName = "") {
  if (!firebaseUser) {
    console.warn("createUserProfile: No user provided");
    return;
  }

  try {
    const userRef = doc(db, "users", firebaseUser.uid);

    // Check if user document already exists
    const existingDoc = await getDoc(userRef);
    if (existingDoc.exists()) {
      console.log("User profile already exists:", firebaseUser.uid);
      return;
    }

    // Create new user profile
    const userData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName:
        displayName ||
        firebaseUser.displayName ||
        firebaseUser.email.split("@")[0],
      photoURL: firebaseUser.photoURL || "",
      emailVerified: firebaseUser.emailVerified || false,
      authProvider: firebaseUser.providerData?.[0]?.providerId || "password",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      bookmarkCount: 0,
      totalViews: 0,
    };

    await setDoc(userRef, userData);
    console.log("User profile created:", firebaseUser.uid);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Get user profile from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User profile data or null
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Send verification email to current user
 * @returns {Promise<void>}
 *
 * NOTE: Emails may go to spam folder because they're from Firebase domain.
 * To improve deliverability, see sendPasswordReset() comments above.
 */
export async function sendVerificationEmail() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No user is logged in");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified");
  }

  try {
    await sendEmailVerification(user);
    console.log("Verification email sent to:", user.email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

/**
 * Send password reset email to user email
 * @param {string} email - User email address
 * @returns {Promise<void>}
 *
 * NOTE: Emails may go to spam folder because they're from Firebase domain.
 * To improve deliverability:
 * 1. Go to Firebase Console → Authentication → Templates
 * 2. Configure custom sender email or domain
 * 3. Set up SPF/DKIM/DMARC records (requires custom domain)
 * 4. Users should check spam folder initially
 */
export async function sendPasswordReset(email) {
  if (!email) {
    throw new Error("Email address is required");
  }

  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent to:", email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    // Map specific errors
    if (error.code === "auth/user-not-found") {
      throw new Error(
        "No account found with this email. Please sign up first.",
      );
    }
    throw error;
  }
}

/**
 * Validate email domain to prevent obviously fake emails
 * Checks for common spam/fake domains and format validity
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email appears legitimate
 */
export function validateEmailDomain(email) {
  // List of known fake/temporary email domains to block
  const blockedDomains = [
    "test.com",
    "fake.com",
    "example.com",
    "temp-mail.org",
    "tempmail.com",
    "guerrillamail.com",
    "mailinator.com",
    "10minutemail.com",
    "throwaway.email",
    "yopmail.com",
    "trashmail.com",
    "temp.email",
    "fakeinbox.com",
    "spam4.me",
  ];

  try {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;

    // Check against blocked domains
    if (blockedDomains.includes(domain)) {
      return false;
    }

    // Check for obviously invalid patterns
    if (
      domain.includes("..") ||
      domain.startsWith(".") ||
      domain.endsWith(".")
    ) {
      return false;
    }

    // Check for at least one dot (example@domain.com)
    if (!domain.includes(".")) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user's email is verified
 * @returns {Promise<boolean>} True if current user's email is verified
 */
export async function isEmailVerified() {
  if (!auth.currentUser) {
    return false;
  }
  // Reload user to get latest emailVerified status
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

/**
 * Wait for email verification with timeout
 * Polls every 2 seconds, max 5 minutes
 * @param {number} maxWaitMs - Maximum milliseconds to wait (default 5 min)
 * @returns {Promise<boolean>} True when email is verified, false if timeout
 */
export async function waitForEmailVerification(maxWaitMs = 5 * 60 * 1000) {
  const pollInterval = 2000; // 2 seconds
  const startTime = Date.now();

  return new Promise((resolve) => {
    const poll = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            console.log("Email verified!");
            resolve(true);
            return;
          }
        }

        if (Date.now() - startTime > maxWaitMs) {
          console.log("Email verification timeout reached");
          resolve(false);
          return;
        }

        setTimeout(poll, pollInterval);
      } catch (error) {
        console.error("Error checking verification status:", error);
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  });
}

/**
 * Update user profile in Firestore
 * @param {string} uid - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, updates) {
  if (!uid) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log("User profile updated:", uid);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Check if user email is verified (for a specific user object)
 * @param {Object} user - Firebase user object
 * @returns {boolean}
 */
export function isUserEmailVerified(user) {
  return user && user.emailVerified === true;
}

/**
 * Get verification status message
 * @param {Object} user - Firebase user object
 * @returns {Object} Status info {isVerified, message}
 */
export function getVerificationStatus(user) {
  if (!user) {
    return {
      isVerified: false,
      message: "Not logged in",
    };
  }

  if (user.emailVerified) {
    return {
      isVerified: true,
      message: "Email verified",
    };
  }

  return {
    isVerified: false,
    message: `Email not verified. Verification link sent to ${user.email}`,
  };
}
