
'use server';

import { getAdminProjectId } from './admin';

/**
 * A server action to securely get the Firebase Project ID from the server's environment.
 */
export async function getProjectId(): Promise<string> {
    try {
        return getAdminProjectId();
    } catch (error) {
        console.error("Failed to get project ID from server action:", error);
        // In a production app, you might want to return a more generic error.
        // For this context, failing loudly helps debugging.
        throw error;
    }
}
