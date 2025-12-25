import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Start creating 3D models.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credits Balance</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/credits">
              <Button variant="outline" size="sm">Buy Credits</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Models</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/models">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm text-muted-foreground">Generating...</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Print Orders</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/orders">
              <Button variant="outline" size="sm">View Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold mb-4">Create Something New</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/generate/text">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">&#x1F4DD;</span>
                Text to 3D
              </CardTitle>
              <CardDescription>
                Describe your idea and generate a 3D model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                7-25 credits depending on model
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/generate/image">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">&#x1F5BC;</span>
                Image to 3D
              </CardTitle>
              <CardDescription>
                Upload an image to convert to 3D
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                7-20 credits depending on options
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/generate/multi-image">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">&#x1F4F8;</span>
                Multi-Image to 3D
              </CardTitle>
              <CardDescription>
                Use 2-4 images for better accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                7-25 credits depending on options
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Models */}
      <h2 className="text-xl font-semibold mb-4">Recent Models</h2>
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No models yet. Start by creating your first 3D model!</p>
          <Link href="/generate/text">
            <Button className="mt-4">Create Your First Model</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
