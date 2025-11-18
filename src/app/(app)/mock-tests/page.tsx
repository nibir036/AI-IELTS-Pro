import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function MockTestsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mock Tests</h1>
                <p className="text-muted-foreground">Test your skills under exam conditions with full-length mock tests.</p>
            </div>
             <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                        <GraduationCap className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">Content Coming Soon!</CardTitle>
                    <CardDescription>
                       The full mock test experience is on its way. Soon, you'll be able to simulate the entire IELTS test, including all four sections, under timed conditions to get a real feel for the exam.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
