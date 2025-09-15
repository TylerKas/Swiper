import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs, getDoc, doc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export type Job = {
    userId: string;
    title: string;
    category: string;
    description: string;
    pay: number;
    estimatedTime: string;
    preferredTime: string;
    preferredDate: string;
    urgency: string;
    requirements: {
        mustHaveCar?: boolean;
        comfortableWithPets?: boolean;
        hasOwnTools?: boolean;
        expComputers?: boolean;
        canLiftHeavy?: boolean;
        expCleaning?: boolean;
      };
    status: "open" | "closed";
    createdAt?: any;
    posterLocation?: { lat: number; lng: number; address?: string } | null;
};

export async function createJob(job: Omit<Job, "userId" | "status" | "createdAt" | "posterLocation">) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    const profSnap = await getDoc(doc(db, "profiles", user.uid));
    const posterLocation = profSnap.exists() ? (profSnap.data() as any).location ?? null : null;

    const payload: Job = {
        ...job,
        userId: user.uid,
        status: "open",
        createdAt: serverTimestamp(),
        posterLocation,
    };
    //ref is a reference to the firestore doct
    //addDoc creates a new document inside that collection
    //db is the actual database
    const ref = await addDoc(collection(db, "jobs"), payload);
    //this gives the id so we can store it elsewhere
    return ref.id
}

//essentially this makes an intersection where everything from the exisitng job is added with an ID
//We want this so it can have a key associated with the job
export type JobWithID = Job & {id:string};

//You use this to accept an array of jobs, it is an async function to fetch job postings, returns an array of jobs
export async function getOpenJobs(pageSize = 25): Promise<JobWithID[]>{
    //collection points at jobs in firestore
    //where includes only open jobs
    //orderBy puts the newest jobs first
    //limit outputs at most 25 docs
    const q = query(
        collection(db, "jobs"),
        where("status", "==", "open"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
    );
    //this onSnapshot sets up a real time listeners and runs callback with the current results
    //the arrow is a cleanup function
    //the snap docs section returns an array of the matched docs
    //the map creates an object containing the firestore ID and the document fields

    //this runs the query to get a snapshot of documents
    const snap = await getDocs(q);
    
    //this loops over the documents returned and returns an array of the jobs
    return snap.docs.map(d=> ({ id: d.id, ...(d.data() as Job)}));
}