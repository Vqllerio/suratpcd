// Firebase Configuration
// Replace these values with your own from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCtS9gG9PV8nDh9hxzWYLe1-sVxBIJQ1U8",
  authDomain: "suratpcd-b7001.firebaseapp.com",
  databaseURL: "https://suratpcd-b7001-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "suratpcd-b7001",
  storageBucket: "suratpcd-b7001.appspot.com",
  messagingSenderId: "123456789012", // Optional: Get from Project Settings
  appId: "1:123456789012:web:abcdef123456" // Optional: Get from Project Settings
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create database reference for use in other files
const db = firebase.database();

// Optional: Log connection status for debugging
console.log("Firebase initialized successfully");