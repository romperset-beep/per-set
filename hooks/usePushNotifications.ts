import { useState, useEffect } from 'react';
import { messaging, db } from '../services/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc, arrayRemove } from 'firebase/firestore';

export const usePushNotifications = (userId?: string) => {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        // Determine current permission on mount
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        try {
            if (typeof Notification === 'undefined') {
                console.warn('Notifications not supported in this environment');
                return;
            }

            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                const msg = await messaging;
                if (msg) {
                    const token = await getToken(msg, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                    });
                    console.log('FCM Token:', token);
                    setFcmToken(token);
                } else {
                    console.warn("Messaging not supported.");
                }
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Listen for foreground messages & fetch token if granted
    useEffect(() => {
        if (permission === 'granted') {
            messaging.then(async (msg) => {
                if (msg) {
                    // 1. Get Token automatically if not present
                    if (!fcmToken) {
                        try {
                            setLoading(true); // START LOADING
                            // Explicitly register service worker first to avoid timeout/path issues
                            let registration;
                            try {
                                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                                console.log('Service Worker registered explicitly:', registration);
                            } catch (swError) {
                                console.warn('Manual SW registration failed, letting SDK try:', swError);
                            }

                            const token = await getToken(msg, {
                                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                                serviceWorkerRegistration: registration // Pass explicit registration
                            });
                            console.log('FCM Token (Auto-fetch):', token);
                            setFcmToken(token);
                            setError(null);
                        } catch (err: any) {
                            console.error("Failed to fetch flush token:", err);
                            setError(err.message || "Failed to fetch token");
                        } finally {
                            setLoading(false); // STOP LOADING
                        }
                    }

                    // 2. Setup listener
                    onMessage(msg, (payload) => {
                        console.log('Foreground Message received:', payload);
                    });
                } else {
                    setError("Messaging not supported (browser)");
                }
            });
        }
    }, [permission]); // REMOVED fcmToken dependency to prevent loop

    // Save token to user profile
    useEffect(() => {
        // Validate userId is a proper UID (not an email)
        const isValidUid = userId && !userId.includes('@');

        if (fcmToken && userId && isValidUid) {
            const saveToken = async () => {
                try {
                    const userRef = doc(db, 'users', userId);
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(fcmToken)
                    });
                    console.log('[Push] Token saved to user profile');
                } catch (err) {
                    // Fallback if doc doesn't exist (e.g. legacy user), try setDoc merge
                    try {
                        const userRef = doc(db, 'users', userId);
                        await setDoc(userRef, { fcmTokens: arrayUnion(fcmToken) }, { merge: true });
                    } catch (retryErr) {
                        console.error('[Push] Failed to save token to firestore:', retryErr);
                    }
                }
            };
            saveToken();
        } else if (userId && !isValidUid) {
            console.warn('[Push] Skipping token save - userId appears to be email instead of UID:', userId);
        }
    }, [fcmToken, userId]);

    // Added: Disable notifications (remove token from server + wipe local state)
    const disableNotifications = async () => {
        const isValidUid = userId && !userId.includes('@');

        if (!fcmToken || !userId || !isValidUid) {
            console.warn('[Push] Cannot disable - invalid userId or no token');
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                fcmTokens: arrayRemove(fcmToken)
            });
            console.log('[Push] Token removed from server');
            setFcmToken(null);
        } catch (error) {
            console.error('[Push] Failed to remove token:', error);
            setError("Impossible de désactiver les notifications (Erreur serveur)");
        } finally {
            setLoading(false);
        }
    };

    return {
        permission,
        requestPermission,
        disableNotifications,
        fcmToken,
        error,
        loading
    };
};


