import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card p-10 rounded-3xl shadow-xl max-w-md w-full text-center border">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-black mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your subscription. Your payment has been processed successfully and your subscription is now active.
        </p>
        <Link href="/dashboard">
          <Button className="w-full h-14 rounded-xl text-lg font-bold">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
