import { db, auth } from "../firebase/config";
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
} from "firebase/firestore";
import { Trip } from "../types";

const TRIPS_COLLECTION = "trips";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveTrip(trip: Omit<Trip, "id">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, TRIPS_COLLECTION), trip);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, TRIPS_COLLECTION);
  }
}

export async function fetchUserTrips(userId: string): Promise<Trip[]> {
  const q = query(
    collection(db, TRIPS_COLLECTION),
    where("userId", "==", userId)
  );

  try {
    const querySnapshot = await getDocs(q);
    const trips: Trip[] = [];
    querySnapshot.forEach((docSnap) => {
      trips.push({ id: docSnap.id, ...docSnap.data() } as Trip);
    });

    // Sort client-side by createdAt descending
    return trips.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TRIPS_COLLECTION);
  }
}

export async function fetchTripById(tripId: string): Promise<Trip | null> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Trip;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${TRIPS_COLLECTION}/${tripId}`);
  }
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  try {
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TRIPS_COLLECTION}/${tripId}`);
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TRIPS_COLLECTION}/${tripId}`);
  }
}
