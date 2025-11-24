import { db } from "../firebaseConfig";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  setDoc,
  doc,
  getDocs
} from "firebase/firestore";

export interface DBUser {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen: any;
}

export interface DBMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: any;
  channelId: string; // 'general' or 'uid1_uid2'
}

// Save user profile to Firestore on login
export const saveUserProfile = async (user: any) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName || "Usuario",
    photoURL: user.photoURL || "",
    email: user.email || "",
    lastSeen: serverTimestamp()
  }, { merge: true });
};

// Listen to all users (for DM list)
export const subscribeToUsers = (callback: (users: DBUser[]) => void) => {
  const q = query(collection(db, "users"), orderBy("lastSeen", "desc"));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as DBUser);
    callback(users);
  });
};

// Send a message
export const sendMessage = async (text: string, sender: any, channelId: string) => {
  await addDoc(collection(db, "messages"), {
    text,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    channelId,
    timestamp: serverTimestamp()
  });
};

// Listen to messages for a specific channel
export const subscribeToMessages = (channelId: string, callback: (msgs: DBMessage[]) => void) => {
  const q = query(
    collection(db, "messages"),
    where("channelId", "==", channelId),
    orderBy("timestamp", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DBMessage));
    callback(messages);
  });
};

// Generate consistent ID for private chats between two users
export const getDirectChannelId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join("_");
};