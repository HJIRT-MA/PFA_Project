"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Initialize Stripe with a test key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_test_51TczAkBgkNOiJ0Bu6VePZ9uHnj6dZsI7CAr8PnAzCvbXzcyIoOviGexwEgFjO8x9EbpMlXqK6LsvZuG6RFB89rw800WMS7XK2Q');

const CheckoutForm = ({ amountCents }: { amountCents: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment.');
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && <div className="text-destructive text-sm">{errorMessage}</div>}
      <Button type="submit" disabled={isProcessing || !stripe || !elements} className="w-full">
        {isProcessing ? 'Processing...' : `Pay €${(amountCents / 100).toFixed(2)}`}
      </Button>
    </form>
  );
};

const Checkout = () => {
  const { sessionId } = useParams();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // In a real app, we might want to fetch the session details and the clientSecret
    // For this flow, the previous page creates the intent and passes clientSecret via state
    // But since the user might refresh, we should ideally be able to re-fetch the clientSecret.
    // For now, we assume the server can return session details including a new/existing clientSecret.
    const fetchSession = async () => {
      try {
        const res = await api.get(`/api/sessions/${sessionId}`);
        const { session, clientSecret: apiSecret } = res.data;
        
        if (!session) {
          router.push('/dashboard');
          return;
        }
        setSessionData(session);
        
        // Use clientSecret from API if available, fallback to history state
        if (apiSecret) {
          setClientSecret(apiSecret);
        } else {
          const state = window.history.state;
          if (state?.usr?.clientSecret) {
            setClientSecret(state.usr.clientSecret);
          } else if (session.status !== 'AWAITING_PAYMENT') {
            setErrorMessage('This session is already ' + session.status.toLowerCase());
          } else {
            setErrorMessage('Payment session expired or could not be retrieved. Please try booking again.');
          }
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to load session details.');
      }
    };
    fetchSession();
  }, [sessionId, router]);

  const [errorMessage, setErrorMessage] = useState('');

  if (errorMessage) {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-muted-foreground mb-8">{errorMessage}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!clientSecret || !sessionData) {
    return <div className="container mx-auto max-w-md py-20 text-center">Loading checkout...</div>;
  }

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Booking</CardTitle>
          <CardDescription>
            Session with {sessionData.tutor.email.split('@')[0]}
            <br />
            {new Date(sessionData.datetime).toLocaleString()} for {sessionData.durationMin} mins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm amountCents={sessionData.amountCents} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkout;
