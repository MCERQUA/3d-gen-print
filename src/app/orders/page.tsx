"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Eye, Truck, Clock, CheckCircle, XCircle } from "lucide-react";

interface PrintOrder {
  id: string;
  orderNumber: string;
  status: string;
  material: string;
  size: string;
  quantity: number;
  total: number;
  thumbnailUrl: string | null;
  prompt: string | null;
  createdAt: string;
  trackingNumber: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "secondary", icon: <Clock className="h-4 w-4" /> },
  PAID: { label: "Paid", color: "default", icon: <CheckCircle className="h-4 w-4" /> },
  PROCESSING: { label: "Processing", color: "default", icon: <Clock className="h-4 w-4 animate-pulse" /> },
  PRINTING: { label: "Printing", color: "default", icon: <Package className="h-4 w-4" /> },
  QUALITY_CHECK: { label: "Quality Check", color: "default", icon: <Eye className="h-4 w-4" /> },
  SHIPPING: { label: "Shipped", color: "default", icon: <Truck className="h-4 w-4" /> },
  DELIVERED: { label: "Delivered", color: "default", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  CANCELED: { label: "Canceled", color: "destructive", icon: <XCircle className="h-4 w-4" /> },
  REFUNDED: { label: "Refunded", color: "secondary", icon: <XCircle className="h-4 w-4" /> },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track your 3D print orders</p>
        </div>
        <Button asChild>
          <Link href="/gallery">
            <Package className="h-4 w-4 mr-2" />
            Order a Print
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">
            Generate a 3D model and order a physical print
          </p>
          <Button asChild>
            <Link href="/generate">Start Creating</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PROCESSING;
            return (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {order.thumbnailUrl ? (
                        <img
                          src={order.thumbnailUrl}
                          alt={order.prompt || "Order"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">
                            #{order.orderNumber.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="font-medium line-clamp-1">
                            {order.prompt || "3D Print Order"}
                          </p>
                        </div>
                        <Badge variant={status.color as "default" | "secondary" | "destructive"}>
                          {status.icon}
                          <span className="ml-1">{status.label}</span>
                        </Badge>
                      </div>

                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{order.material}</span>
                        <span>{order.size}</span>
                        <span>Qty: {order.quantity}</span>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <p className="font-semibold">
                          ${(order.total / 100).toFixed(2)}
                        </p>
                        <div className="flex gap-2">
                          {order.trackingNumber && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={`https://track.aftership.com/${order.trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Track
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orders/${order.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
