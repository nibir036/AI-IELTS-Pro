
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, PenSquare, Speech, BarChart } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

const features = [
  {
    icon: PenSquare,
    title: 'AI Writing Evaluation',
    description: 'Get instant, band-score-aligned feedback on your essays.',
    image: PlaceHolderImages.find((img) => img.id === 'feature-1'),
  },
  {
    icon: Speech,
    title: 'AI Speaking Practice',
    description: 'Improve your fluency and pronunciation with our advanced AI tutor.',
    image: PlaceHolderImages.find((img) => img.id === 'feature-2'),
  },
  {
    icon: BarChart,
    title: 'Personalized Path',
    description: 'A custom learning plan designed to take you from your current to target band.',
    image: PlaceHolderImages.find((img) => img.id === 'feature-3'),
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-7 w-7 text-primary"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7l4 4-4 4z" />
          </svg>
          <span className="text-xl font-bold">AI IELTS Pro</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
           {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              data-ai-hint={heroImage.imageHint}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20"></div>
          <div className="container relative mx-auto px-4 text-center text-primary-foreground md:px-6">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Your AI-Powered Path to IELTS Success
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-lg md:text-xl">
              Achieve your target band score with personalized learning paths, instant feedback, and realistic mock tests.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/login">Start Your Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="w-full bg-background py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Features Designed for Success
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to conquer the IELTS exam.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="overflow-hidden">
                  {feature.image && (
                    <div className="aspect-video w-full overflow-hidden">
                      <Image
                        src={feature.image.imageUrl}
                        alt={feature.image.description}
                        data-ai-hint={feature.image.imageHint}
                        width={600}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <feature.icon className="h-6 w-6 text-primary" />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full bg-muted py-12 md:py-24 lg:py-32">
          <div className="container mx-auto grid items-center gap-8 px-4 md:grid-cols-2 md:px-6">
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                Why Us?
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                The Smartest Way to Prepare for IELTS
              </h2>
              <p className="text-muted-foreground">
                Our platform leverages the power of Gemini AI to provide you with an unparalleled learning experience that's both effective and engaging.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <span>
                    <strong>Instant Analysis:</strong> No more waiting for feedback. Get detailed reports in seconds.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <span>
                    <strong>Personalized Curriculum:</strong> Focus on what you need to improve most.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <span>
                    <strong>24/7 Availability:</strong> Practice anytime, anywhere, with your personal AI tutor.
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
                <Card className="max-w-md bg-background p-6 shadow-lg">
                    <CardHeader>
                        <CardTitle>Ready to Boost Your Score?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Join hundreds of students who have achieved their dream scores with AI IELTS Pro.</p>
                        <Button className="w-full" size="lg" asChild>
                            <Link href="/login">Start Learning Now</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row md:px-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AI IELTS Pro. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-sm hover:underline">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm hover:underline">
              Privacy Policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
