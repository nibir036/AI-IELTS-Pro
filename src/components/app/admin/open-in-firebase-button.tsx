
'use client';

import { Button } from "@/components/ui/button";

interface OpenInFirebaseButtonProps {
    projectId: string;
    collection: string;
    docId: string;
}

export function OpenInFirebaseButton({ projectId, collection, docId }: OpenInFirebaseButtonProps) {
    const handleClick = () => {
        if (!projectId) {
            console.error("Firebase project ID is not available.");
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
