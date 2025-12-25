import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center bg-gradient-to-b from-background to-muted">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Turn Ideas Into
          <span className="text-primary"> 3D Reality</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
          Generate stunning 3D models from text or images using AI.
          Preview, customize, and order physical prints delivered to your door.
        </p>
        <div className="flex gap-4">
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" className="text-lg px-8">
                Start Creating Free
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/generate">
              <Button size="lg" className="text-lg px-8">
                Start Generating
              </Button>
            </Link>
          </SignedIn>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          25 free credits on signup - no credit card required
        </p>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-muted/50">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Create
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F4DD;</span>
                  Text to 3D
                </CardTitle>
                <CardDescription>
                  Describe your vision in words and watch AI bring it to life
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Simply describe what you want - a character, object, or scene.
                  Our AI generates a detailed 3D model with textures in minutes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F5BC;</span>
                  Image to 3D
                </CardTitle>
                <CardDescription>
                  Upload an image and transform it into a 3D model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Have a reference image? Upload it and our AI will create a
                  matching 3D model. Works with photos, artwork, and sketches.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F3A8;</span>
                  Retexture & Remesh
                </CardTitle>
                <CardDescription>
                  Customize your models with new textures and optimized geometry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Change the look of any model with AI-generated textures.
                  Optimize polygon count for printing or game engines.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F3AC;</span>
                  Rigging & Animation
                </CardTitle>
                <CardDescription>
                  Bring characters to life with auto-rigging and animations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatically rig humanoid characters and apply from a library
                  of professional animations. Perfect for games and videos.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F441;</span>
                  3D Viewer
                </CardTitle>
                <CardDescription>
                  Inspect your models from every angle before printing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Full 3D preview with orbit controls. Examine details, check
                  textures, and download in multiple formats (GLB, FBX, STL).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">&#x1F4E6;</span>
                  Order Prints
                </CardTitle>
                <CardDescription>
                  Get your models 3D printed and delivered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Choose your material and size, then we&apos;ll 3D print and ship
                  your creation. Multiple materials from PLA to resin available.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple Credit Pricing</h2>
          <p className="text-muted-foreground mb-8">
            Buy credits and use them for any generation type
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Starter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">$4.99</p>
                <p className="text-muted-foreground">50 credits</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Basic</CardTitle>
                <CardDescription>Most Popular</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">$12.99</p>
                <p className="text-muted-foreground">150 credits</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">$39.99</p>
                <p className="text-muted-foreground">500 credits</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Studio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">$99.99</p>
                <p className="text-muted-foreground">1500 credits</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Text-to-3D: 7-25 credits | Image-to-3D: 7-20 credits | Remesh: 7 credits
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 3D Gen Print. Powered by Meshy.ai
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
