
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
 apiKey: "AIzaSyColFxGzISwZt3spyIm07tpSUqNaK3J9-s",
  authDomain: "agicred-push.firebaseapp.com",
  projectId: "agicred-push",
  storageBucket: "agicred-push.firebasestorage.app",
  messagingSenderId: "254591707488",
  appId: "1:254591707488:web:f5b2859674db4411885605",
  measurementId: "G-L1SL2LXP0T"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

