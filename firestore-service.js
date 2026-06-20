// File: firestore-service.js
// Firestore Operations for Views and Likes Tracking

import {
  db,
  auth
} from './firebase-config.js';

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

/**
 * FIRESTORE SCHEMA
 * 
 * Collection: prompts
 * Document: {promptId}
 * {
 *   id: string,
 *   title: string,
 *   category: string,
 *   image: string,
 *   prompt: string,
 *   bookmarks: number,
 *   date: string,
 *   views: number (default: 0),
 *   likes: number (default: 0),
 *   createdAt: timestamp
 * }
 * 
 * Collection: likes
 * Document: {userId}_{promptId}
 * {
 *   userId: string,
 *   promptId: string,
 *   createdAt: timestamp
 * }
 */

const PROMPTS_COLLECTION = 'prompts';
const LIKES_COLLECTION = 'likes';

/**
 * Get a unique anonymous user ID
 * Creates and stores in localStorage if doesn't exist
 */
function getAnonymousUserId() {
  let anonId = localStorage.getItem('pv_anonId');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('pv_anonId', anonId);
  }
  return anonId;
}

/**
 * Get user identifier (authenticated user ID or anonymous ID)
 */
function getUserIdentifier() {
  const user = auth.currentUser;
  return user ? user.uid : getAnonymousUserId();
}

// ========== VIEW TRACKING ==========

/**
 * Increment views for a prompt
 * Uses atomic increment to avoid race conditions
 */
export async function recordPromptView(promptId) {
  try {
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);
    
    // Use atomic increment
    await updateDoc(promptRef, {
      views: increment(1),
      updatedAt: serverTimestamp()
    });
    
    console.log(`View recorded for prompt: ${promptId}`);
    return { success: true };
  } catch (error) {
    console.error('Error recording view:', error);
    
    // If prompt doesn't exist, create it
    if (error.code === 'not-found') {
      return createPromptDocument(promptId);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Create a new prompt document with default values
 */
export async function createPromptDocument(promptId, promptData = {}) {
  try {
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);
    
    const docData = {
      id: promptId,
      views: 0,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...promptData
    };
    
    await setDoc(promptRef, docData);
    console.log(`Prompt document created: ${promptId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating prompt document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current prompt metrics (views and likes)
 */
export async function getPromptMetrics(promptId) {
  try {
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);
    const docSnapshot = await getDoc(promptRef);
    
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        views: data.views || 0,
        likes: data.likes || 0
      };
    } else {
      // Create document if it doesn't exist
      await createPromptDocument(promptId);
      return { views: 0, likes: 0 };
    }
  } catch (error) {
    console.error('Error getting prompt metrics:', error);
    return { views: 0, likes: 0, error: error.message };
  }
}

// ========== LIKE TRACKING ==========

/**
 * Check if current user (authenticated or anonymous) has liked a prompt
 */
export async function getUserLikeStatus(promptId) {
  const userIdentifier = getUserIdentifier();
  
  try {
    const likeDocId = `${userIdentifier}_${promptId}`;
    const likeRef = doc(db, LIKES_COLLECTION, likeDocId);
    const docSnapshot = await getDoc(likeRef);
    
    return { liked: docSnapshot.exists() };
  } catch (error) {
    console.error('Error checking like status:', error);
    return { liked: false, error: error.message };
  }
}

/**
 * Toggle like/unlike for a prompt
 * Works for both authenticated and anonymous users
 * 
 * If user already liked:
 *   - Remove like document
 *   - Decrement likes count
 * 
 * If user hasn't liked:
 *   - Create like document
 *   - Increment likes count
 */
export async function togglePromptLike(promptId) {
  const userIdentifier = getUserIdentifier();
  const user = auth.currentUser;
  
  try {
    const likeDocId = `${userIdentifier}_${promptId}`;
    const likeRef = doc(db, LIKES_COLLECTION, likeDocId);
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);
    
    // Check if user already liked
    const likeSnapshot = await getDoc(likeRef);
    const alreadyLiked = likeSnapshot.exists();
    
    if (alreadyLiked) {
      // Unlike: Remove like document and decrement count
      await deleteDoc(likeRef);
      await updateDoc(promptRef, {
        likes: increment(-1),
        updatedAt: serverTimestamp()
      });
      
      console.log(`Unlike recorded for prompt: ${promptId}`);
      return {
        success: true,
        liked: false,
        message: 'Like removed'
      };
    } else {
      // Like: Create like document and increment count
      await setDoc(likeRef, {
        userId: userIdentifier,
        isAnonymous: !user,
        promptId: promptId,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(promptRef, {
        likes: increment(1),
        updatedAt: serverTimestamp()
      });
      
      console.log(`Like recorded for prompt: ${promptId}`);
      return {
        success: true,
        liked: true,
        message: 'Like added'
      };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ========== REAL-TIME LISTENERS ==========

/**
 * Listen to prompt metrics changes in real-time
 * Calls callback whenever views or likes change
 */
export function listenToPromptMetrics(promptId, callback) {
  try {
    const promptRef = doc(db, PROMPTS_COLLECTION, promptId);
    
    const unsubscribe = onSnapshot(promptRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          views: data.views || 0,
          likes: data.likes || 0
        });
      } else {
        callback({ views: 0, likes: 0 });
      }
    }, (error) => {
      console.error('Error listening to prompt metrics:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up real-time listener:', error);
    return () => {};
  }
}

/**
 * Listen to user's like status in real-time
 * Calls callback when user likes/unlikes
 */
export function listenToUserLikeStatus(promptId, callback) {
  const userIdentifier = getUserIdentifier();
  
  try {
    const likeDocId = `${userIdentifier}_${promptId}`;
    const likeRef = doc(db, LIKES_COLLECTION, likeDocId);
    
    const unsubscribe = onSnapshot(likeRef, (doc) => {
      callback({ liked: doc.exists() });
    }, (error) => {
      console.error('Error listening to like status:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up like status listener:', error);
    return () => {};
  }
}

/**
 * Listen to all prompts' metrics (for bulk updates)
 * Use this for updating all visible cards when Firestore data changes
 */
export function listenToAllPromptMetrics(promptIds, callback) {
  try {
    // Create separate listeners for each prompt
    const unsubscribers = promptIds.map((promptId) => {
      return listenToPromptMetrics(promptId, (metrics) => {
        callback(promptId, metrics);
      });
    });
    
    // Return function to unsubscribe from all listeners
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  } catch (error) {
    console.error('Error setting up bulk listeners:', error);
    return () => {};
  }
}

// ========== INITIALIZATION ==========

/**
 * Initialize prompts in Firestore
 * Run this once when your app loads to ensure all prompts exist
 */
export async function initializePromptsInFirestore(prompts) {
  try {
    for (const prompt of prompts) {
      const promptRef = doc(db, PROMPTS_COLLECTION, prompt.id);
      const docSnapshot = await getDoc(promptRef);
      
      // Only create if doesn't exist
      if (!docSnapshot.exists()) {
        await setDoc(promptRef, {
          id: prompt.id,
          title: prompt.title,
          category: prompt.category,
          image: prompt.img,
          prompt: prompt.prompt,
          bookmarks: prompt.bookmarks,
          date: prompt.date,
          views: 0,
          likes: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
    
    console.log('Prompts initialized in Firestore');
    return { success: true };
  } catch (error) {
    console.error('Error initializing prompts:', error);
    return { success: false, error: error.message };
  }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Get all likes by user
 */
export async function getUserLikes(userId) {
  try {
    const q = query(
      collection(db, LIKES_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data().promptId);
  } catch (error) {
    console.error('Error getting user likes:', error);
    return [];
  }
}

/**
 * Get all prompts sorted by views
 */
export async function getTopPromptsByViews(limit = 10) {
  try {
    const q = query(
      collection(db, PROMPTS_COLLECTION)
      // Note: Firestore requires composite index for orderBy on multiple fields
      // For now, we'll fetch and sort in JavaScript
    );
    const querySnapshot = await getDocs(q);
    
    const prompts = querySnapshot.docs.map(doc => doc.data());
    return prompts.sort((a, b) => b.views - a.views).slice(0, limit);
  } catch (error) {
    console.error('Error getting top prompts:', error);
    return [];
  }
}

/**
 * Get all prompts sorted by likes
 */
export async function getTopPromptsByLikes(limit = 10) {
  try {
    const q = query(collection(db, PROMPTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    const prompts = querySnapshot.docs.map(doc => doc.data());
    return prompts.sort((a, b) => b.likes - a.likes).slice(0, limit);
  } catch (error) {
    console.error('Error getting top prompts:', error);
    return [];
  }
}
