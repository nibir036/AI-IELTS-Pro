'use client';

import { Button } from "@/components/ui/button";

interface OpenInFirebaseButtonProps {
    collection: string;
    docId: string;
}

export function OpenInFirebaseButton({ collection, docId }: OpenInFirebaseButtonProps) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const handleClick = () => {
        if (!projectId) {
            console.error("Firebase project ID is not configured.");
            return;
        }
        const url = `https://console.firebase.google.com/project/${projectId}/firestore/data/~2F${collection}~2F${docId}`;
        window.open(url, '_blank');
    };

    return (
        <Button variant="outline" size="sm" onClick={handleClick}>
            Open in Firebase
        </Button>
    );
}
