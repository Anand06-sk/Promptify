// auth.js

import { auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/**
 * Login with Google
 * @returns {Promise<Object>} User object on success
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("Google login successful:", result.user.email);
    return result.user;
  } catch (error) {
    console.error("Google login error:", error.message);
    throw error;
  }
}

/**
 * Signup with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object on success
 */
export async function signupWithEmail(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Signup successful:", result.user.email);
    return result.user;
  } catch (error) {
    console.error("Signup error:", error.message);
    throw error;
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
    console.log("Email login successful:", result.user.email);
    return result.user;
  } catch (error) {
    console.error("Email login error:", error.message);
    throw error;
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
    console.error("Logout error:", error.message);
    throw error;
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
      console.log("User logged in:", user.email);
      callback(user);
    } else {
      console.log("User logged out");
      callback(null);
    }
  });
}
