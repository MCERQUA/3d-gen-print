import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function GeneratePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Generate 3D Model</h1>
        <p className="text-muted-foreground">
          Choose how you want to create your 3D model
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/generate/text">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x1F4DD;</span>
                Text to 3D
              </CardTitle>
              <CardDescription className="text-base">
                Describe what you want to create in words. Our AI will generate
                a detailed 3D model based on your description.
              </CardDescription>
              <p className="text-sm text-primary mt-2">7-25 credits</p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate/image">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x1F5BC;</span>
                Image to 3D
              </CardTitle>
              <CardDescription className="text-base">
                Upload a single image and convert it into a 3D model.
                Works best with clear, well-lit photos of objects.
              </CardDescription>
              <p className="text-sm text-primary mt-2">7-20 credits</p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate/multi-image">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x1F4F8;</span>
                Multi-Image to 3D
              </CardTitle>
              <CardDescription className="text-base">
                Upload 2-4 images from different angles for more accurate
                3D model generation.
              </CardDescription>
              <p className="text-sm text-primary mt-2">7-25 credits</p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate/retexture">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x1F3A8;</span>
                Retexture
              </CardTitle>
              <CardDescription className="text-base">
                Apply new AI-generated textures to an existing 3D model.
                Change the look without changing the shape.
              </CardDescription>
              <p className="text-sm text-primary mt-2">12 credits</p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate/remesh">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x2699;</span>
                Remesh
              </CardTitle>
              <CardDescription className="text-base">
                Optimize polygon count and convert formats. Prepare models
                for 3D printing or game engines.
              </CardDescription>
              <p className="text-sm text-primary mt-2">7 credits</p>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/generate/rig">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">&#x1F3AC;</span>
                Rig & Animate
              </CardTitle>
              <CardDescription className="text-base">
                Add a skeleton to humanoid characters and apply animations
                from our library.
              </CardDescription>
              <p className="text-sm text-primary mt-2">5-8 credits</p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
