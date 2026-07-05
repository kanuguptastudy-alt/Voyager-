import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { Trip } from "../types";

const TRIPS_COLLECTION = "trips";

export async function saveTrip(trip: Omit<Trip, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION), trip);
  return docRef.id;
}

export async function fetchUserTrips(userId: string): Promise<Trip[]> {
  // Query only by userId to avoid requiring a composite Firestore index for orderBy
  const q = query(
    collection(db, TRIPS_COLLECTION),
    where("userId", "==", userId)
  );

  const querySnapshot = await getDocs(q);
  const trips: Trip[] = [];
  querySnapshot.forEach((docSnap) => {
    trips.push({ id: docSnap.id, ...docSnap.data() } as Trip);
  });

  // Sort client-side by createdAt descending
  return trips.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function fetchTripById(tripId: string): Promise<Trip | null> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Trip;
  }
  return null;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  await updateDoc(docRef, updates);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  await deleteDoc(docRef);
}
