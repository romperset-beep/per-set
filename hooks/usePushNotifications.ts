import { useState, useEffect } from 'react';
import { messaging, db } from '../services/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';

export const usePushNotifications = (userId?: string) => {
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        // Determine current permission on mount
        setPermission(Notification.permission);
    }, []);

    const requestPermission = async () => {
        try {
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

    // Listen for foreground messages & fetch token if granted
    useEffect(() => {
        if (permission === 'granted') {
            messaging.then(async (msg) => {
                if (msg) {
                    // 1. Get Token automatically if not present
                    if (!fcmToken) {
                        try {
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
    }, [permission, fcmToken]);

    // Save token to user profile
    useEffect(() => {
        if (fcmToken && userId) {
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
        }
    }, [fcmToken, userId]);

    return {
        permission,
        requestPermission,
        fcmToken,
        error
    };
};


