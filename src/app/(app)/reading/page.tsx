import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function ReadingPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reading Practice</h1>
                <p className="text-muted-foreground">Sharpen your reading comprehension with a variety of texts.</p>
            </div>
            <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">Content Coming Soon!</CardTitle>
                    <CardDescription>
                        We're busy preparing a wide range of academic and general interest texts for you to practice with. Soon, you'll be able to tackle full reading passages, answer questions, and get detailed explanations.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
