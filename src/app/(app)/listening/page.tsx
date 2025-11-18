import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones } from 'lucide-react';

export default function ListeningPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Listening Practice</h1>
                <p className="text-muted-foreground">Improve your listening skills with authentic audio recordings.</p>
            </div>
             <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                        <Headphones className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">Content Coming Soon!</CardTitle>
                    <CardDescription>
                        Get ready to tune in! We are curating a collection of high-quality audio clips, from lectures to conversations, to help you master the listening test.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
